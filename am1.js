'use strict';

function AdaptiveCardMobileRender(targetDom) {
    this.targetDom = targetDom || "content";
}

AdaptiveCardMobileRender.onExecuteAction = null;
var popupWindow = null;
var selectedAction = null;
var messageCardJson = null;
var extendedMessageCardJson = null;
var messageCardHash = null;

AdaptiveCardMobileRender.prototype.HttpAction = function () {
    AdaptiveCards.HttpAction.call(this);
};

AdaptiveCardMobileRender.prototype.init = function () {
    AdaptiveCards.AdaptiveCard.onExecuteAction = onExecuteAction;

    AdaptiveCards.AdaptiveCard.actionTypeRegistry.unregisterType("Action.Submit"); // Action.Submit is not supported in Mobile

    // -------------------------- Customize http action for Mobile ---------------------------
    this.HttpAction.prototype = Object.create(AdaptiveCards.HttpAction.prototype);
    this.HttpAction.prototype.parse = function (json) {
        AdaptiveCards.HttpAction.prototype.parse.call(this, json);
    };

    this.HttpAction.prototype.prepare = function (inputs) {
        if (this._originalData) {
            this._processedData = JSON.parse(JSON.stringify(this._originalData));
        }
        else {
            this._processedData = {};
        }
        for (var i = 0; i < inputs.length; i++) {
            var inputValue = inputs[i].value;
            if (inputValue != null) {
                this._processedData[inputs[i].id] = inputs[i].value;
            }
        }
        this._isPrepared = true;
    };

    Object.defineProperty(this.HttpAction.prototype, "data", {
        get: function () {
            return this._isPrepared ? this._processedData : this._originalData;
        },
        set: function (value) {
            this._originalData = value;
            this._isPrepared = false;
        },
        enumerable: true,
        configurable: true
    });

    AdaptiveCards.AdaptiveCard.actionTypeRegistry.registerType("Action.Http", function () {
        return new this.HttpAction();
    }.bind(this));
};

AdaptiveCardMobileRender.prototype.registerActionExecuteCallback = function (callbackName) {
    AdaptiveCardMobileRender.onExecuteAction = function (jsonString) {
        eval(callbackName + "(jsonString);");
    };
};

AdaptiveCardMobileRender.prototype.render = function () {
    extendedMessageCardJson = JSON.parse(getMessageCard());
    messageCardJson = JSON.parse(extendedMessageCardJson['MessageCardSerialized']);
    var messageCard = new MessageCard();
    messageCard.parse(messageCardJson);
    var renderedCard = messageCard.render();
    var parent = document.querySelector(this.targetDom);
    parent.innerHTML = '';
    parent.appendChild(renderedCard);

    var body = document.body;
    var html = document.documentElement;

    var height = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);

    onHeightChange(height);

   var sha256 = new Hashes.SHA256;
   messageCardHash = sha256.b64(extendedMessageCardJson['MessageCardSerialized']).toString();

    //computeMessageCardHash(JSON.minify(extendedMessageCardJson['MessageCardSerialized']), function(result) {
    //    messageCardHash = result;
    //}, function(err){
    //    messageCardHash = null;
    //    console.log("Error generating message card hash");
    //})
};

AdaptiveCardMobileRender.prototype.onActionExecuted = function (responseJson) {
    var displayText = responseJson.displayMessage;
    if (authError(responseJson)) {
        selectedAction.setStatus(buildAuthFailureStatusCard(displayText, "https://outlook.office.com" + responseJson.authenticationUrl, "normal", "large"));
    } else {
        selectedAction.setStatus(buildStatusCard(displayText, "normal", "large"));
    }
};

function authError(json) {
    return "ConnectedAccountNotFoundError" == json['innerErrorCode'];
}

function buildAuthFailureStatusCard(text, url, weight, size) {
    return {
        "type": "AdaptiveCard",
        "body": [{
            "type": "TextBlock",
            "text": text,
            "weight": weight,
            "size": "small"
        }],
        "actions": [{
            "type": "Action.OpenUrl",
            "title": "Please log in",
            "url": url
        }]
    };
};

function buildStatusCard(text, weight, size) {
    return {
        "type": "AdaptiveCard",
        "body": [
            {
                "type": "TextBlock",
                "text": text,
                "weight": weight,
                "size": "small"
            }
        ]
    };
};

function onExecuteAction(action) {
    if (action instanceof AdaptiveCards.ShowCardAction){
        selectedAction = action;
        showCardAction(action);
    }
    else if (action instanceof AdaptiveCards.OpenUrlAction) {
        var data = {}
        data['Type'] = 'OpenUri'
        data['Uri'] = action.url;
        if (AdaptiveCardMobileRender.onExecuteAction != null){
            AdaptiveCardMobileRender.onExecuteAction(JSON.stringify(data));
        }
    }
    else if (action instanceof AdaptiveCards.HttpAction) {
        //ToDo: Change this
        var inputParameters = 
        [
            {
                'id' : 'comment',
                'value' : action.data['comment']
            }
        ]

        var actionPayload = generateActionPayload(inputParameters, action.id);

        if (AdaptiveCardMobileRender.onExecuteAction != null){
            AdaptiveCardMobileRender.onExecuteAction(JSON.stringify(actionPayload));
        }

        if(popupWindow != null)
        {
            popupWindow.close();
            popupWindow = null;
        }

        var statusJson = {
            "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
            "type": "AdaptiveCard",
            "version": "1.0",
            "body": [
                {
                    "type": "ColumnSet",
                    "columns": [
                        {
                            "type": "Column",
                            "width": "auto",
                            "items": [
                                {
                                    "type": "Image",
                                    "url": "https://messagecarddemo.blob.core.windows.net/messagecard/loader.gif",
                                    "size": "small"
                                }
                            ]
                        },
                        {
                            "type": "Column",
                            "items": [
                                {
                                    "type": "Container",
                                    "height": "stretch"
                                },
                                {
                                    "type": "TextBlock",
                                    "height": "auto",
                                    "text": "Working on it",
                                    "size": "small",
                                    "spacing": "small"
                                },
                                {
                                    "type": "Container",
                                    "height": "stretch"
                                }
                            ]
                        }
                    ]
                }
            ]
        }

        selectedAction.setStatus(statusJson);            
    }
}

function showCardAction(action){    
    var NativeSupportedActions = ['DateInput', 'ChoiceSetInput'];
    if(action != null && action.card != null && action.card._items!= null && action.card._items.length == 2 &&
       action.card._items[0].constructor != null && NativeSupportedActions.indexOf(action.card._items[0].constructor.name) !=-1 &&
       action.card._items[1].constructor != null && action.card._items[1].constructor.name == "ActionSet" && 
       action.card._items[1]._actionCollection != null && action.card._items[1]._actionCollection.items != null &&
       action.card._items[1]._actionCollection.items.length == 1 && action.card._items[1]._actionCollection.items[0].constructor != null &&
       action.card._items[1]._actionCollection.items[0].constructor.name == "HttpAction")
    {
        if(action.card._items[0].constructor.name == "DateInput"){
            showDatePicker();           
        }
        else if(action.card._items[0].constructor.name == "ChoiceSetInput"){
            var choices = action.card._items[0].choices;
            choices.forEach(function(item)
            {
                item['display'] = item['title'];
            });
            showChoicePicker(action);          
        }
    }
    else{
        showPopupCard(action);
    }
}

function getSwiftPotentialAction(json, actionId){
    var potentialAction = null;
    if(json['sections'] != undefined)
    {
        for(var i = 0;i < json['sections'].length; i++)
        {
            if(json['sections'][i]['potentialAction'] != undefined)
            {
                potentialAction = SearchPotentialAction(json['sections'][i]['potentialAction'], actionId);
            }
        }        
    }
    if(potentialAction == null && json['potentialAction'] != undefined)
    {
        potentialAction = SearchPotentialAction(json['potentialAction'], actionId);
    }

    if(potentialAction == null)
    {
        throw new Exception();
    }

    return potentialAction;
}

function SearchPotentialAction(potentialActions, actionId)
{
    for(var i = 0; i < potentialActions.length; i++)
    {
        if(potentialActions[i]['@id'] == actionId)
        {
            //ToDo:
        }
        else if(potentialActions[i]['actions'] != null)
        {
            for(var j = 0; j < potentialActions[i]['actions'].length; j++)
            {
                if(potentialActions[i]['actions'][j]['@id'] == actionId)
                {
                    return potentialActions[i]['actions'][j];
                }
            }    
        }
    }
}

function computeMessageCardHash(messageCardSerializedString, successCallback, errorCallback) {
    try {
        var messageCardEncoded = unescape(encodeURIComponent(messageCardSerializedString));
        MsrCryptoUtils.ComputeSHA256(messageCardEncoded, successCallback, errorCallback, false);
    }
    catch (ex) {
        console.log("Failed to generate message card hash", ex);
        errorCallback("Unable to generate message card hash");
    }
}

function generateActionPayload(inputParameters, actionId)
{
    var actionPayload = {
        'inputParameters' : inputParameters,
        'actionId' : actionId,
        'potentialAction' : JSON.stringify(getSwiftPotentialAction(messageCardJson, actionId)),
        'messageCardSignature' : extendedMessageCardJson['MessageCardSignature'],
        'connectorSenderGuid' : extendedMessageCardJson['ConnectorSenderGuid'],
        'providerAccountUniqueId' : extendedMessageCardJson['ProviderAccountUniqueId'],
        'messageCardHash' : messageCardHash,
        'clientTelemetry' : {}    
    }

    return actionPayload;
}

function parseInputDate(inputDate)
{
    var parsedInput = parseDatePickerInput(inputDate);
    var inputParameters = 
    [
        {
            'id' : selectedAction.card._items[0].id,
            'value' : parsedInput
        }
    ]

    var actionPayload = generateActionPayload(inputParameters, selectedAction.card._items[1]._actionCollection.items[0].id);
    if (AdaptiveCardMobileRender.onExecuteAction != null){            
        AdaptiveCardMobileRender.onExecuteAction(JSON.stringify(actionPayload));
    }

    selectedAction.setStatus(buildStatusCard("Working on it...", "normal", "large"));            
}

function parseInputChoice(inputChoice)
{
    var parsedInput = parseChoicePickerInput(inputChoice);    
    var inputParameters = 
    [
        {
            'id' : selectedAction.card._items[0].id,
            'value' : parsedInput
        }
    ]

    var actionPayload = generateActionPayload(inputParameters, selectedAction.card._items[1]._actionCollection.items[0].id);
    if (AdaptiveCardMobileRender.onExecuteAction != null){        
        AdaptiveCardMobileRender.onExecuteAction(JSON.stringify(actionPayload));
    }

    selectedAction.setStatus(buildStatusCard("Working on it...", "normal", "large"));                
}

function showPopupCard(action) {
    var width = 350;
    var height = 250;
    // We are running in the browser so we need to center the new window ourselves
    var left = window.screenLeft ? window.screenLeft : window.screenX;
    var top = window.screenTop ? window.screenTop : window.screenY;
    left += (window.innerWidth / 2) - (width / 2);
    top += (window.innerHeight / 2) - (height / 2);
    // Open a child window with a desired set of standard browser features
    popupWindow = window.open("", '_blank', 'toolbar=no, location=yes, status=no, menubar=no, top=' + top + ', left=' + left + ', width=' + width + ', height=' + height);
    if (!popupWindow) {
        // If we failed to open the window fail the authentication flow
        throw new Error("Failed to open popup");
    };

    //TODO: Change this as required
    popupWindow.document.head.innerHTML+= '<link rel="stylesheet" type="text/css" href="https://saurabhdaksh.github.io/am-js-css/app.css">';
    popupWindow.document.head.innerHTML+= '<link rel="stylesheet" type="text/css" href="https://saurabhdaksh.github.io/am-js-css/adaptivecard.css">';

    var overlayElement = popupWindow.document.createElement("div");
    overlayElement.id = "popupOverlay";
    overlayElement.className = "popupOverlay";
    overlayElement.tabIndex = 0;
    overlayElement.style.width = "auto"; // popupWindow.document.documentElement.scrollWidth + "px";
    overlayElement.style.height = popupWindow.document.documentElement.scrollHeight + "px";
    overlayElement.onclick = function (e) {
        document.body.removeChild(overlayElement);
    };
    var cardContainer = popupWindow.document.createElement("div");
    cardContainer.className = "popupCardContainer";
    cardContainer.onclick = function (e) { e.stopPropagation(); };
    cardContainer.appendChild(action.card.render());
    overlayElement.appendChild(cardContainer);
    popupWindow.document.body.appendChild(overlayElement);
}

function MessageCard() {
    this.style = "default";
}

function HostContainer() {
    this.allowCardTitle = true;
    this.allowFacts = true;
    this.allowHeroImage = true;
    this.allowImages = true;
    this.allowActionCard = true;
}

MessageCard.prototype.parse = function (json) {
    this.hostContainer = new HostContainer();

    this.defaultCardConfig = {
        "supportsInteractivity": true,
        "fontFamily": "Segoe UI",
        "fontSizes": {
            "small": "0.75em",
            "default": "0.875em",
            "medium": "1.1em",
            "large": "1.31em",
            "extraLarge": "1.625em"
        },
        "fontWeights": {
            "lighter": 200,
            "default": 400,
            "bolder": 600
        },
        "imageSizes": {
            "small": 40,
            "medium": 80,
            "large": 160
        },
        "containerStyles": {
            "default": {
                "fontColors": {
                    "default": {
                        "normal": "#333333",
                        "subtle": "#EE333333"
                    },
                    "accent": {
                        "normal": "#2E89FC",
                        "subtle": "#882E89FC"
                    },
                    "good": {
                        "normal": "#54a254",
                        "subtle": "#DD54a254"
                    },
                    "warning": {
                        "normal": "#e69500",
                        "subtle": "#DDe69500"
                    },
                    "attention": {
                        "normal": "#cc3300",
                        "subtle": "#DDcc3300"
                    }
                },
                "backgroundColor": "#8e8e93"
            },
            "emphasis": {
                "fontColors": {
                    "default": {
                        "normal": "#8e8e93",
                        "subtle": "#EE333333"
                    },
                    "accent": {
                        "normal": "#2E89FC",
                        "subtle": "#882E89FC"
                    },
                    "good": {
                        "normal": "#54a254",
                        "subtle": "#DD54a254"
                    },
                    "warning": {
                        "normal": "#e69500",
                        "subtle": "#DDe69500"
                    },
                    "attention": {
                        "normal": "#cc3300",
                        "subtle": "#DDcc3300"
                    }
                },
                "backgroundColor": "#08000000"
            }
        },
        "spacing": {
            "small": 3,
            "default": 8,
            "medium": 20,
            "large": 30,
            "extraLarge": 40,
            "padding": 20
        },
        "separator": {
            "lineThickness": 1,
            "lineColor": "#EEEEEE"
        },
        "actions": {
            "maxActions": 5,
            "spacing": "Default",
            "buttonSpacing": 10,
            "showCard": {
                "actionMode": "Popup",
                "inlineTopMargin": 16,
                "style": "Emphasis"
            },
            "preExpandSingleShowCardAction": false,
            "actionsOrientation": "Horizontal",
            "actionAlignment": "Left"
        },
        "adaptiveCard": {
            "allowCustomStyle": false
        },
        "imageSet": {
            "imageSize": "Medium",
            "maxImageHeight": "maxImageHeight"
        },
        "factSet": {
            "title": {
                "size": "default",
                "color": "default",
                "isSubtle": false,
                "weight": "lighter",
                "warp": true
            },
            "value": {
                "size": "1em",
                "color": "Default",
                "isSubtle": false,
                "weight": "Default",
                "warp": true
            },
            "spacing": 10
        }
    };

    this.summary = json["summary"];
    this.themeColor = json["themeColor"];
    if (json["style"]) {
        this.style = json["style"];
    }

    this._adaptiveCard = new AdaptiveCards.AdaptiveCard();
    this._adaptiveCard.hostConfig = new AdaptiveCards.HostConfig(this.defaultCardConfig);
    
    if (json["title"] != undefined) {
        var textBlock = new AdaptiveCards.TextBlock();
        textBlock.text = json["title"];
        textBlock.size = "large";
        textBlock.wrap = true;
        this._adaptiveCard.addItem(textBlock);
    }

    if (json["text"] != undefined) {
        var textBlock = new AdaptiveCards.TextBlock();
        textBlock.text = json["text"],
        textBlock.wrap = true;
        this._adaptiveCard.addItem(textBlock);
    }

    if (json["sections"] != undefined) {
        var sectionArray = json["sections"];
        for (var i = 0; i < sectionArray.length; i++) {
            var section = parseSection(sectionArray[i], this.hostContainer);
            this._adaptiveCard.addItem(section);
        }
    }
    if (json["potentialAction"] != undefined) {
        var actionSet = parseActionSet(json["potentialAction"], this.hostContainer);
        actionSet.actionStyle = "link";
        this._adaptiveCard.addItem(actionSet);
    }
};
MessageCard.prototype.render = function () {
    return this._adaptiveCard.render();
};

function parsePicture(json, defaultSize, defaultStyle) {
    if (defaultSize === void 0) { defaultSize = "medium"; }
    if (defaultStyle === void 0) { defaultStyle = "normal"; }
    var picture = new AdaptiveCards.Image();
    picture.url = json["image"];
    picture.size = json["size"] ? json["size"] : defaultSize;
    return picture;
}

function parseImageSet(json) {
    var imageSet = new AdaptiveCards.ImageSet();
    var imageArray = json;
    for (var i = 0; i < imageArray.length; i++) {
        var image = parsePicture(imageArray[i], "small");
        imageSet.addImage(image);
    }
    return imageSet;
}

function parseFactSet(json) {
    var factSet = new AdaptiveCards.FactSet();
    var factArray = json;
    for (var i = 0; i < factArray.length; i++) {
        var fact = new AdaptiveCards.Fact();
        fact.name = factArray[i]["name"];
        fact.value = factArray[i]["value"];
        factSet.facts.push(fact);
    }
    return factSet;
}

function getUrlFromOS(os, targets) {
    return targets.filter(
        function(targets){return targets.os == os}
    );
}

function parseOpenUrlAction(json) {
    var action = new AdaptiveCards.OpenUrlAction();
    action.title = json["name"];
    if(json["targets"] != null) {
        //ToDo: Android
        var found = getUrlFromOS("android", json["targets"]);
        if(found.length >= 1)
        {
            action.url = found[0]["uri"];
        }
        else{
            found = getUrlFromOS("default", json["targets"])
            if(found.length >= 1)
            {
                action.url = found[0]["uri"];
            }    
        }
    }
    return action;
}

function parseHttpAction(json) {
    var mobileRender = new AdaptiveCardMobileRender();
    var action = new mobileRender.HttpAction();
    action.method = "POST";
    action.body = json["body"];
    action.title = json["name"];
    action.url = json["target"];
    action.id = json["@id"];
    return action;
}

function parseInvokeAddInCommandAction(json) {
    var action = new InvokeAddInCommandAction();
    action.title = json["name"];
    action.addInId = json["addInId"];
    action.desktopCommandId = json["desktopCommandId"];
    action.initializationContext = json["initializationContext"];
    return action;
}

function parseInput(input, json) {
    input.id = json["id"];
    input.defaultValue = json["value"];
}

function parseTextInput(json) {
    var input = new AdaptiveCards.TextInput();
    parseInput(input, json);
    input.placeholder = json["title"];
    input.isMultiline = json["isMultiline"];
    return input;
}

function parseDateInput(json) {
    var input = new AdaptiveCards.DateInput();
    parseInput(input, json);
    return input;
}

function parseChoiceSetInput(json) {
    var input = new AdaptiveCards.ChoiceSetInput();
    parseInput(input, json);
    input.placeholder = json["title"];
    var choiceArray = json["choices"];
    if (choiceArray) {
        for (var i = 0; i < choiceArray.length; i++) {
            var choice = new AdaptiveCards.Choice();
            choice.title = choiceArray[i]["display"];
            choice.value = choiceArray[i]["value"];
            input.choices.push(choice);
        }
    }
    input.isMultiSelect = json["isMultiSelect"];
    input.isCompact = !(json["style"] === "expanded");
    return input;
}

function parseShowCardAction(json, host) {
    var showCardAction = new AdaptiveCards.ShowCardAction();
    showCardAction.title = json["name"];
    showCardAction.card.actionStyle = "button";
    var inputArray = json["inputs"];
    if (inputArray) {
        for (var i = 0; i < inputArray.length; i++) {
            var jsonInput = inputArray[i];
            var input = null;
            switch (jsonInput["@type"]) {
                case "TextInput":
                    input = parseTextInput(jsonInput);
                    break;
                case "DateInput":
                    input = parseDateInput(jsonInput);
                    break;
                case "MultiChoiceInput":
                    input = parseChoiceSetInput(jsonInput);
                    break;
            }
            if (input) {
                showCardAction.card.addItem(input);
            }
        }
    }
    var actionArray = json["actions"];
    if (actionArray) {
        showCardAction.card.addItem(parseActionSet(actionArray, host));
    }
    return showCardAction;
}

function parseActionSet(json, host) {
    var actionSet = new AdaptiveCards.ActionSet();
    var actionArray = json;
    for (var i = 0; i < actionArray.length; i++) {
        var jsonAction = actionArray[i];
        var action = null;
        switch (jsonAction["@type"]) {
            case "OpenUri":
                action = parseOpenUrlAction(jsonAction);
                break;
            case "HttpPOST":
                action = parseHttpAction(jsonAction);
                break;
            case "InvokeAddInCommand":
                action = parseInvokeAddInCommandAction(jsonAction);
                break;
            case "ActionCard":
                if (host.allowActionCard) {
                    action = parseShowCardAction(jsonAction, host);
                }
                break;
        }
        if (action) {
            actionSet.addAction(action);
        }
    }
    return actionSet;
}

function parseSection(json, host) {
    var section = new AdaptiveCards.Container();
    section.separation = json["startGroup"] ? "strong" : "default";
    if (json["title"] != undefined) {
        var textBlock = new AdaptiveCards.TextBlock();
        textBlock.text = json["title"];
        textBlock.size = "medium";
        textBlock.wrap = true;
        section.addItem(textBlock);
    }
    if(json["style"] != null)
    {
        section.style = json["style"] == "emphasis" ? "emphasis" : "normal";
    }
    if (json["activityTitle"] != undefined || json["activitySubtitle"] != undefined ||
        json["activityText"] != undefined || json["activityImage"] != undefined) {
        var columnSet = new AdaptiveCards.ColumnSet();
        var column;
        // Image column
        if (json["activityImage"] != null) {
            column = new AdaptiveCards.Column();
            column.size = "auto";
            var image = new AdaptiveCards.Image();
            image.size = json["activityImageSize"] ? json["activityImageSize"] : "small";
            image.style = json["activityImageStyle"] ? json["activityImageStyle"] : "person";
            image.url = json["activityImage"];
            column.addItem(image);
            columnSet.addColumn(column);
        }
        // Text column
        column = new AdaptiveCards.Column;
        column.size = "stretch";
        if (json["activityTitle"] != null) {
            var textBlock_1 = new AdaptiveCards.TextBlock();
            textBlock_1.text = json["activityTitle"];
            textBlock_1.separation = "none";
            textBlock_1.wrap = true;
            column.addItem(textBlock_1);
        }
        if (json["activitySubtitle"] != null) {
            var textBlock_2 = new AdaptiveCards.TextBlock();
            textBlock_2.text = json["activitySubtitle"];
            textBlock_2.weight = "lighter";
            textBlock_2.isSubtle = true;
            textBlock_2.separation = "none";
            textBlock_2.wrap = true;
            column.addItem(textBlock_2);
        }
        if (json["activityText"] != null) {
            var textBlock_3 = new AdaptiveCards.TextBlock();
            textBlock_3.text = json["activityText"];
            textBlock_3.separation = "none";
            textBlock_3.wrap = true;
            column.addItem(textBlock_3);
        }
        columnSet.addColumn(column);
        section.addItem(columnSet);
    }
    if (host.allowHeroImage) {
        var heroImage = json["heroImage"];
        if (heroImage != undefined) {
            var image_1 = parsePicture(heroImage);
            image_1.size = "auto";
            section.addItem(image_1);
        }
    }
    if (json["text"] != undefined) {
        var text = new AdaptiveCards.TextBlock();
        text.text = json["text"];
        text.wrap = true;
        section.addItem(text);
    }
    if (host.allowFacts) {
        if (json["facts"] != undefined) {
            var factGroup = parseFactSet(json["facts"]);
            section.addItem(factGroup);
        }
    }
    if (host.allowImages) {
        if (json["images"] != undefined) {
            var pictureGallery = parseImageSet(json["images"]);
            section.addItem(pictureGallery);
        }
    }
    if (json["potentialAction"] != undefined) {
        var actionSet = parseActionSet(json["potentialAction"], host);
        actionSet.actionStyle = "link";
        section.addItem(actionSet);
    }
    return section;
}

function getMessageCard(){
    return android.getCard();
};

function onHeightChange(height){
    return android.onHeightChange(height);
};

function showDatePicker() {
    return android.showDatePicker(0, "parseInputDate");
};

function showChoicePicker(action){
    return android.showChoicePicker(action.card._items[0].placeholder,JSON.stringify(action.card._items[0].choices), JSON.stringify([]), action.card._items[0].isMultiSelect, "parseInputChoice")    
}

function parseChoicePickerInput(input){
    // TODO: also handle for multi choick picker
    if (input.length > 0) {
        return input[0]["value"]
    }

    return input
}

function parseDatePickerInput(input){
    return input;
}
