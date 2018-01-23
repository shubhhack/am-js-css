'use strict';

var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();

function MessageCardRenderer(targetDom, os) {
    this.targetDom = targetDom || "content";
    this.os = os;
}

MessageCardRenderer.prototype.HttpAction = function () {
    AdaptiveCards.HttpAction.call(this);
};

MessageCardRenderer.prototype.CustomizeHttpAction = function() {
    this.HttpAction.prototype = Object.create(AdaptiveCards.HttpAction.prototype);
    this.HttpAction.prototype.parse = function (json) {
        AdaptiveCards.HttpAction.prototype.parse.call(this, json);
    };

    this.HttpAction.prototype.prepare = function (inputs) {
        this._processedData = [];  
        for (var i = 0; i < inputs.length; i++) {
            var inputValue = inputs[i].value;
            if (inputValue != null) {
                this._processedData.push({'id' : inputs[i].id, 'value' : inputs[i].value});
            }
        }
        this._isPrepared = true;
    };

    Object.defineProperty(this.HttpAction.prototype, "data", {
        get: function () {
            return this._processedData;
        },
        enumerable: true,
        configurable: true
    });
};

MessageCardRenderer.prototype.FactSet = function(){
    AdaptiveCards.FactSet.call(this);
}

MessageCardRenderer.prototype.CustomizeFactSet = function(){
    this.FactSet.prototype = Object.create(AdaptiveCards.FactSet.prototype);
    this.FactSet.prototype.internalRender = function () {
        var element = null;
        if (this.facts.length > 0) {
            element = document.createElement("table");
            element.style.borderWidth = "0px";
            element.style.borderSpacing = "0px";
            element.style.borderStyle = "none";
            element.style.borderCollapse = "collapse";
            element.style.display = "block";
            element.style.overflow = "hidden";
            for (var i = 0; i < this.facts.length; i++) {
                var trElement = document.createElement("tr");
                if (i > 0) {
                    trElement.style.marginTop = this.hostConfig.factSet.spacing + "px";
                }
                var tdElement = document.createElement("td");
                tdElement.style.padding = "0";
                if (this.hostConfig.factSet.title.maxWidth) {
                    tdElement.style.maxWidth = this.hostConfig.factSet.title.maxWidth + "px";
                }
                tdElement.style.verticalAlign = "top";
                var textBlock = new AdaptiveCards.TextBlock();
                textBlock.hostConfig = this.hostConfig;
                textBlock.text = this.facts[i].name;
                textBlock.size = this.hostConfig.factSet.title.size;
                textBlock.color = this.hostConfig.factSet.title.color;
                textBlock.isSubtle = this.hostConfig.factSet.title.isSubtle;
                textBlock.weight = this.hostConfig.factSet.title.weight;
                textBlock.wrap = this.hostConfig.factSet.title.wrap;
                //textBlock.spacing = AdaptiveCards.Enums.Spacing.None;
                appendChild(tdElement, textBlock.render());
                appendChild(trElement, tdElement);
                appendChild(element, trElement);
                
                trElement = document.createElement("tr");
                if (i > 0) {
                    trElement.style.marginTop = this.hostConfig.factSet.spacing + "px";
                }
                tdElement = document.createElement("td");
                tdElement.style.padding = "0px 0px 0px 10px";
                tdElement.style.verticalAlign = "top";
                textBlock = new AdaptiveCards.TextBlock();
                textBlock.hostConfig = this.hostConfig;
                textBlock.text = this.facts[i].value;
                textBlock.size = this.hostConfig.factSet.value.size;
                textBlock.color = this.hostConfig.factSet.value.color;
                textBlock.isSubtle = this.hostConfig.factSet.value.isSubtle;
                textBlock.weight = this.hostConfig.factSet.value.weight;
                textBlock.wrap = this.hostConfig.factSet.value.wrap;
                //textBlock.spacing = AdaptiveCards.Enums.Spacing.None;
                appendChild(tdElement, textBlock.render());
                appendChild(trElement, tdElement);
                appendChild(element, trElement);
            }
        }
        return element;
    };
}

MessageCardRenderer.prototype.MoreAction = /** @class */ (function (_super) {
    __extends(MoreAction, _super);
    function MoreAction() {
        var _this = _super.call(this) || this;
        _this.items = [];
        this.title = "More";
        return _this;
    };
    MoreAction.prototype.getJsonTypeName = function () {
        return "Action.More";
    };
    MoreAction.prototype.validate = function () {
        return this._actionCollection.validate();        
    };
    MoreAction.prototype.addAction = function (action) {
        if (action != null) {
            this.items.push(action);
        }
    };
    MoreAction.prototype.getAllInputs = function () {
        var result = [];
        for (var i = 0; i < this.items.length; i++) {
            var item = this.items[i];
            result = result.concat(item.getAllInputs());
        }
        return result;
    };
    return MoreAction;
}(AdaptiveCards.Action));

MessageCardRenderer.prototype.init = function () {
    MessageCardRenderer.onActionSubmitted = null;
    MessageCardRenderer.onOpenUrlActionSubmitted = null;
    MessageCardRenderer.extendedMessageCardJson = null;
    MessageCardRenderer.messageCardJson = null;
    MessageCardRenderer.selectedAction = null;
    MessageCardRenderer.popupWindow = null;
    MessageCardRenderer.messageCardHash = null;
    
    this.CustomizeHttpAction();
    this.CustomizeFactSet();

    AdaptiveCards.AdaptiveCard.onExecuteAction = onExecuteAction;
    
    // Action.Submit is not supported in Outlook
    AdaptiveCards.AdaptiveCard.actionTypeRegistry.unregisterType("Action.Submit"); 

    // Customize http action for Outlook
    AdaptiveCards.AdaptiveCard.actionTypeRegistry.registerType("Action.Http", function () {
        return new this.HttpAction();
    }.bind(this));

    AdaptiveCards.AdaptiveCard.elementTypeRegistry.registerType("FactSet", function() {
        return new this.FactSet();
    }.bind(this));

    AdaptiveCards.AdaptiveCard.actionTypeRegistry.registerType("Action.More", function(){
        return new this.MoreAction();
    }.bind(this));
};

MessageCardRenderer.prototype.registerActionExecuteCallback = function (callbackName) {
    MessageCardRenderer.onActionSubmitted = function (jsonString) {
        eval(callbackName + "(jsonString);");
    };
};

MessageCardRenderer.prototype.registerOpenUrlActionExecuteCallback = function (callbackName) {
    MessageCardRenderer.onOpenUrlActionSubmitted = function (jsonString) {
        eval(callbackName + "(jsonString);");
    };
};

MessageCardRenderer.prototype.registerAuthUrlActionExecuteCallback = function (callbackName) {
    MessageCardRenderer.onAuthUrlActionClicked = function (jsonString) {
        eval(callbackName + "(jsonString);");
    };
};

MessageCardRenderer.prototype.renderCardJson = function(cardJson){
    var messageCard = new MessageCard(cardConfigJson, this.os);
    messageCard.parse(cardJson);
    var renderedCard = messageCard.render();
    var parent = document.querySelector(this.targetDom);
    if(parent){
        parent.innerHTML = '';
        parent.appendChild(renderedCard);    
    }

    var body = document.body;
    var html = document.documentElement;

    var height = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
    onHeightChange(height);
}

MessageCardRenderer.prototype.render = function () {
    try{
        console.log("Render entered");
        MessageCardRenderer.extendedMessageCardJson = JSON.parse(getMessageCard());
        MessageCardRenderer.messageCardJson = JSON.parse(MessageCardRenderer.extendedMessageCardJson['MessageCardSerialized']);
        var messageCard = new MessageCard(cardConfigJson, this.os);
        messageCard.parse(MessageCardRenderer.messageCardJson);
        var renderedCard = messageCard.render();
        var parent = document.querySelector(this.targetDom);
        if(parent){
            parent.innerHTML = '';
            parent.appendChild(renderedCard);    
        }
    
        var body = document.body;
        var html = document.documentElement;
    
        var height = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
        onHeightChange(height);
        //MessageCardRenderer.renderCardJson(MessageCardRenderer.messageCardJson);
        var sha256 = new Hashes.SHA256;
        MessageCardRenderer.messageCardHash = sha256.b64(MessageCardRenderer.extendedMessageCardJson['MessageCardSerialized']).toString();    
    }
    catch(e){
        console.log(e.message);
        //ToDo: Client specific logging. Log e.message and extendedMessageCardJson
    }
};

MessageCardRenderer.prototype.displayActionStatusMessage = function (displayText) {
    MessageCardRenderer.selectedAction.setStatus(buildStatusCard(displayText, "normal", "large"));
};

MessageCardRenderer.prototype.setCardVisible = function (isVisible) {
    var parent = document.querySelector(this.targetDom);
    if (parent) {
        parent.style.display = isVisible ? 'block' : 'none';
    }
};

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

MessageCardRenderer.prototype.processActionResponse = function(responseJson, callback){
    var showGenericError = false;    
    try{
        if(responseJson['removeCard'] === true){
            this.setCardVisible(false);
            if (callbacks.UpdateExplicitMessageCardProperty) {
                callbacks.UpdateExplicitMessageCardProperty();
            }
            return;
        }
        else if(responseJson['hideCard'] === true){  
            this.setCardVisible(false);
            return;
        }
        else if(responseJson["innerErrorCode"] != null &&
        responseJson["innerErrorCode"] === "ConnectedAccountNotFoundError"){
            //ToDo:If it only outlook.office.com?
            MessageCardRenderer.selectedAction.setStatus(buildAuthFailureStatusCard(responseJson["displayMessage"], "https://outlook.office.com" + responseJson.authenticationUrl, "normal", "large"));        
        }
        else if(responseJson["refreshCard"] != null){
            MessageCardRenderer.messageCardJson = responseJson["refreshCard"];
            this.renderCardJson(responseJson["refreshCard"]);
            var sha256 = new Hashes.SHA256;
            MessageCardRenderer.messageCardHash = sha256.b64(MessageCardRenderer.extendedMessageCardJson['refreshCardSerialized']).toString();    
        }
        else if(responseJson["displayMessage"] != null){
            this.displayActionStatusMessage(responseJson["displayMessage"]);
        }
        else{
            showGenericError = true;
        }    
    }catch(e){
        showGenericError = true
        //ToDo: Client Specific logging. Log e.Message and response string   
    }

    if(showGenericError === true){
        this.displayActionStatusMessage("Action could not be completed");
    }
}

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
    var messageCardRenderer = new MessageCardRenderer();
    if (action instanceof AdaptiveCards.ShowCardAction){
        MessageCardRenderer.selectedAction = action;
        showCardAction(action);
    }
    else if(action instanceof messageCardRenderer.MoreAction){
        MessageCardRenderer.selectedAction = action;
        handleMoreActionClick(action);
    }
    else if (action instanceof AdaptiveCards.OpenUrlAction) {
        if(action.url.indexOf("outlook.office.com/connectors") !== -1){
            MessageCardRenderer.onAuthUrlActionClicked(action.url);
        }
        else{
            MessageCardRenderer.onOpenUrlActionSubmitted(action.url);            
        }
    }
    else if (action instanceof AdaptiveCards.HttpAction) {

        var actionPayload = generateActionPayload(action.data, action.id);

        if (MessageCardRenderer.onActionSubmitted != null){
            MessageCardRenderer.onActionSubmitted(JSON.stringify(actionPayload));
        }

        if(MessageCardRenderer.popupWindow != null)
        {
            MessageCardRenderer.popupWindow.close();
            MessageCardRenderer.popupWindow = null;
        }

        //showWorkingStatus();
        MessageCardRenderer.selectedAction.setStatus(buildStatusCard("Working on it..", "normal", "small"));        
    }
};

function showWorkingStatus(){
    var statusJson = {
        "type": "AdaptiveCard",
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

    MessageCardRenderer.selectedAction.setStatus(statusJson);  
}

function handleMoreActionClick(action){
    showMoreActions(action);
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
        throw new Exception('Potential Action Not Found');
    }

    return potentialAction;
}

function SearchPotentialAction(potentialActions, actionId)
{
    for(var i = 0; i < potentialActions.length; i++)
    {
        if(potentialActions[i]['@id'] == actionId)
        {
            throw new Exception("Action not excepted here");
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

function generateActionPayload(inputParameters, actionId)
{
    var actionPayload = {
        'inputParameters' : inputParameters,
        'actionId' : actionId,
        'potentialAction' : JSON.stringify(getSwiftPotentialAction(MessageCardRenderer.messageCardJson, actionId)),
        'messageCardSignature' : MessageCardRenderer.extendedMessageCardJson['MessageCardSignature'],
        'connectorSenderGuid' : MessageCardRenderer.extendedMessageCardJson['ConnectorSenderGuid'],
        'providerAccountUniqueId' : MessageCardRenderer.extendedMessageCardJson['ProviderAccountUniqueId'],
        'messageCardHash' : MessageCardRenderer.messageCardHash,
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
            'id' : MessageCardRenderer.selectedAction.card._items[0].id,
            'value' : parsedInput
        }
    ]

    var actionPayload = generateActionPayload(inputParameters, MessageCardRenderer.selectedAction.card._items[1]._actionCollection.items[0].id);
    if (MessageCardRenderer.onActionSubmitted != null){            
        MessageCardRenderer.onActionSubmitted(JSON.stringify(actionPayload));
    }

    MessageCardRenderer.selectedAction.setStatus(buildStatusCard("Working on it", "normal", "large"));

    //showWorkingStatus();
}

function parseInputChoice(inputChoice)
{
    var parsedInput = parseChoicePickerInput(inputChoice);    
    var inputParameters = 
    [
        {
            'id' : MessageCardRenderer.selectedAction.card._items[0].id,
            'value' : parsedInput
        }
    ]

    var actionPayload = generateActionPayload(inputParameters, MessageCardRenderer.selectedAction.card._items[1]._actionCollection.items[0].id);
    if (MessageCardRenderer.onActionSubmitted != null){        
        MessageCardRenderer.onActionSubmitted(JSON.stringify(actionPayload));
    }

    MessageCardRenderer.selectedAction.setStatus(buildStatusCard("Working on it", "normal", "large"));
    //showWorkingStatus();
}


function getSelectedActionFromList(title, actionList){
    return actionList.filter(
        function(action){return action.title == title}
    );
}
function parseInputActionChoice(inputChoice)
{
    var parsedInput = parseActionChoiceInput(inputChoice);
    var actions = getSelectedActionFromList(parsedInput, MessageCardRenderer.selectedAction.items);
    if(actions.length == 1){
        onExecuteAction(actions[0]);
    }
}

function showPopupCard(action) {
    //ToDo: Change as required for client
    var width = 350;
    var height = 250;
    var left = window.screenLeft ? window.screenLeft : window.screenX;
    var top = window.screenTop ? window.screenTop : window.screenY;
    left += (window.innerWidth / 2) - (width / 2);
    top += (window.innerHeight / 2) - (height / 2);
    var popupWindow = window.open("", '_blank', 'toolbar=no, location=yes, status=no, menubar=no, top=' + top + ', left=' + left + ', width=' + width + ', height=' + height);
    if (!popupWindow) {
        // If we failed to open the window fail the authentication flow
        throw new Error("Failed to open popup");
    };

    //ToDo: Change this as required
    popupWindow.document.head.innerHTML+= '<link rel="stylesheet" type="text/css" href="http://adaptivecards.io/visualizer/css/app.css">';
    popupWindow.document.head.innerHTML+= '<link rel="stylesheet" type="text/css" href="http://adaptivecards.io/visualizer/css/teams.css">';

    var overlayElement = popupWindow.document.createElement("div");
    overlayElement.id = "popupOverlay";
    overlayElement.className = "popupOverlay";
    overlayElement.tabIndex = 0;
    overlayElement.style.width = "auto";
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
    MessageCardRenderer.popupWindow = popupWindow;
}

function appendChild(node, child) {
    if (child != null && child != undefined) {
        node.appendChild(child);
    }
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

function parseDatePickerInput(input){
    return input;
};

function showChoicePicker(action){
    return android.showChoicePicker(action.card._items[0].placeholder,JSON.stringify(action.card._items[0].choices), JSON.stringify([]), action.card._items[0].isMultiSelect, "parseInputChoice")    
};

function parseChoicePickerInput(input){
    if (input.length == 1) {
        return input[0]["value"]
    }
    else if(input.length > 1){
        var output = input.map(function(elem){
            return elem.value;        
        }).join(";");
        return output + ";";
    }

    return input;
};

function showMoreActions(action){
    var json = [];
    for(var i = 0; i < action.items.length; i++){
        json.push({'id' : action.items[i].title, 'display' : action.items[i].title})
    }

    return android.showChoicePicker("More",JSON.stringify(json), JSON.stringify([]), false, "parseInputActionChoice")
}

function parseActionChoiceInput(input){
    return input[0]["display"];
}



var cardConfigJson = {
    "supportsInteractivity": true,
    "fontFamily": "Segoe UI",
    "fontSizes": {
        "small": 12,
        "default": 14,
        "medium": 17,
        "large": 21,
        "extraLarge": 26
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
                    "normal": "#212121",
                    "subtle": "#EE333333"
                },
                "accent": {
                    "normal": "#8e8e93",
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
            "backgroundColor": "#FFFFFF"
        },
        "emphasis": {
            "fontColors": {
                "default": {
                    "normal": "#2E89FC",
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
            "size": "Default",
            "color": "accent",
            "isSubtle": false,
            "weight": "Bolder",
            "warp": true
        },
        "value": {
            "size": "Default",
            "color": "Default",
            "isSubtle": false,
            "weight": "Default",
            "warp": true
        },
        "spacing": 10
    }
};
