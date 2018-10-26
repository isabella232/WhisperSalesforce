var allTabs = {};
class ConversationTemplate {

    constructor(suggestionTemplate, questionTemplate, facetTemplate) {
        this.questions =  questionTemplate;
        this.suggestions = suggestionTemplate;
        this.facets = facetTemplate;
    }

    setQuestionContext(questionContext) {
        this.questionContext = questionContext;
    }

    setSuggestionContext(suggestionContext) {
        this.suggestionContext = suggestionContext;
    }
    
    setFacetContext(facetContext) {
        this.facetContext = facetContext;
    }

    clear() {
        this.questionContext = null;
        this.suggestionContext = null;
        this.facetContext = null;
        document.getElementById('conversations').innerHTML = '';
        document.getElementById('facets').innerHTML = '';
    }

    refresh() {
        let suggestionHtml = '';
        let questionHtml = '';
        let facetHtml = '';

        if (this.suggestionContext)
            suggestionHtml = this.suggestions(this.suggestionContext);
        if (this.questionContext)
            questionHtml = this.questions(this.questionContext);
        if (this.facetContext)
            facetHtml = this.facets(this.facetContext);

        document.getElementById('conversations').innerHTML = questionHtml + suggestionHtml  ;
        document.getElementById('facets').innerHTML = facetHtml;
    }
}

sforce.console.setCustomConsoleComponentPopoutable(false, null);

var timeSend = null;
const SUGGESTION_ENDPOINT = 'https://whisper-dev.us-east-1.elasticbeanstalk.com/whisper/suggestions';
const HEADERS = {
    "Content-Type": "application/json"
};

const COLLAPSE_ICON = "fa-angle-down";
const EXPAND_ICON = "fa-angle-up";

var messageType = {
    'Chasitor': 0,
    'Agent': 1
};

var sentMessage = {};
var chatStartedHandler = function(result) {
    let chatKey = result.chatKey;
    let newInstanceTemplate = addNewInstance();
    addNewTab(result, newInstanceTemplate);    
    
    fetch(`${SUGGESTION_ENDPOINT}?chatkey=${chatKey}`)
        .then(data => data.json())
        .then(json =>  createAll(json, chatKey,newInstanceTemplate))
        .catch( error =>  console.log(`Invalid URL, there is no response. Error:  ${error}`));
    sforce.console.chat.onNewMessage(chatKey, (result) => onNewMessageHandler(result, chatKey,newInstanceTemplate));       
}

var changeWhisperTab = function(result) {
    changeConversationContext(result.id);
}

sforce.console.chat.onChatStarted(chatStartedHandler);
sforce.console.onFocusedPrimaryTab (changeWhisperTab)

var onNewMessageHandler = function (result, chatKey, newInstanceTemplate) {
    timeSend = performance.now();
    newInstanceTemplate.clear();

    let query = (result.type == 'Chasitor') ?  result.content : sentMessage.url || result.content;

    let data = {
        chatkey: chatKey,
        Query: query,
        type: messageType[result.type]
    };

    fetch( SUGGESTION_ENDPOINT, { method: "POST", body: JSON.stringify(data),  headers: HEADERS }) 
        .then(data => data.json())
        .then(json =>  createAll(json, chatKey, newInstanceTemplate))
        .catch( error =>  console.log(`Invalid URL, there is no response. Error:  ${error}`));

    sforce.console.chat.getDetailsByChatKey(chatKey, result => {
        sforce.console.focusPrimaryTabById(result.primaryTabId, null);
    });    
}

function addNewInstance() {
    let sourceSuggestion   = document.getElementById("suggestion-template").innerHTML;
    let suggestionTemplate = Handlebars.compile(sourceSuggestion);
    let sourceQuestion   = document.getElementById("question-template").innerHTML;
    let questionTemplate = Handlebars.compile(sourceQuestion);
    let sourceFacet  = document.getElementById("facet-template").innerHTML;
    let facetTemplate = Handlebars.compile(sourceFacet);
    let template = new ConversationTemplate(suggestionTemplate,questionTemplate,facetTemplate);
    template.refresh();
    return template;
}

function addNewTab(result, instance) {
    allTabs[result.chatKey] = instance
}

function createAll(json, chatKey, template) {
    if (json.questions && json.questions.length > 0) {
        let questionContext = {
            questions: json.questions,
            chatkey: chatKey,
        };
        template.setQuestionContext(questionContext);
    }

    if (json.suggestedDocuments && json.suggestedDocuments.length > 0) {
        let suggestionContext = {
            suggestions: json.suggestedDocuments,
            chatkey: chatKey,
        };
        template.setSuggestionContext(suggestionContext);
    } 

    if (json.activeFacets && json.activeFacets.length > 0) {
        let facetContext = {
            facets: json.activeFacets,
            chatkey: chatKey,
        };
        template.setFacetContext(facetContext);
    }
    
    console.log(`Execution time: ${(performance.now() - timeSend).toString()}`);
    template.refresh();
    sforce.console.setCustomConsoleComponentVisible(true);
}

function facetCancelClick(chatKey, facetId) {
    // TODO -> Send UA for facet cancel
    let template = allTabs[chatKey];
    template.clear();
    let data = {
        chatkey: chatKey
    };

    fetch(`${SUGGESTION_ENDPOINT}/facets/${facetId || ''}`, { method: "DELETE", body: JSON.stringify(data),  headers: HEADERS })
        .then(data => data.json())
        .then(json =>  createAll(json, chatKey, template))
        .catch( error =>  console.log(`Invalid URL, there is no response. Error:  ${error}`));
}

function chooseSuggestionClick(agentInput, chatKey, suggestionId, type) {
    // TODO -> Send UA Suggestion / Question choosen depending on type variable
    let data = {
        chatkey: chatKey,
        id: suggestionId
    };
    fetch(`${SUGGESTION_ENDPOINT}/select`, { method: "POST", body: JSON.stringify(data),  headers: HEADERS })
        .catch( error =>   console.log(`Invalid URL, there is no response. Error:  ${error}`));
    sforce.console.chat.setAgentInput(chatKey, agentInput, null);
}

function changeVisibilityClick(element,idToHide) {
    let classList = element.classList;
    let elementToHandle = document.getElementById(idToHide);

    if (classList.contains(COLLAPSE_ICON)) {
        classList.remove(COLLAPSE_ICON);
        classList.add(EXPAND_ICON);
        elementToHandle.style.display = "none";
    } 
    else if (classList.contains(EXPAND_ICON)) {
        classList.remove(EXPAND_ICON);
        classList.add(COLLAPSE_ICON);
        elementToHandle.style.display = "initial";
    }
}

function changeConversationContext(tabId) {
    sforce.console.chat.getDetailsByPrimaryTabId(tabId, result => {
        if (result.details) {
            let conversations = allTabs[result.details.chatKey];
            conversations.refresh();
        }
    });
}

function openURL(url) {
    window.open(url, '_blank');
} 