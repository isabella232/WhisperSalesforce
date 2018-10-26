var allTabs = {};
class ConversationTemplate {
    constructor(suggestionHtml, filterHtml) {
        this.suggestionHtml = suggestionHtml;
        this.questions =  suggestionHtml.getElementsByClassName('questionSection')[0];
        this.suggestions = suggestionHtml.getElementsByClassName('suggestionSection')[0];
        this.facets = filterHtml.getElementsByClassName('facetSection')[0];
        this.filterHtml = filterHtml;
    }

    clear() {
        this.questions.innerHTML = '';
        this.suggestions.innerHTML = '';
        this.facets.innerHTML = '';
    }

    refresh() {
            document.getElementById('conversations').innerHTML = this.suggestionHtml.outerHTML || '';
            document.getElementById('facets').innerHTML = this.filterHtml.outerHTML || '';
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
    let templateSuggestion = document.getElementById('templateSuggestion');
    let templateAsHTML = templateSuggestion.content.cloneNode(true).firstElementChild;
    let templateFacet = document.getElementById('templateFacet');
    let templateFacetAsHtml = templateFacet.content.cloneNode(true).firstElementChild;
    let template = new ConversationTemplate(templateAsHTML,templateFacetAsHtml);
    template.refresh();
    return template;
}

function addNewTab(result, instance) {
        allTabs[result.chatKey] = instance
}

function setAgentInputSuccess(result) {
    if (!result.success) {
        console.log(result)
    } 
}

function createAll(json, chatKey, template) {
    if (json.questions && json.questions.length > 0) {
        createQuestions(json.questions, chatKey, template);
    }

    if (json.suggestedDocuments && json.suggestedDocuments.length > 0){
        createSuggestions(json.suggestedDocuments, chatKey, template);
    } 
    else if (json.activeFacets && json.activeFacets.length > 0) {
        template.suggestions.innerHTML += `<div style="margin:0 auto;width:400px"><h3>There is no suggestion with current filter</h3><p>Try to reduce active filter</p></div>`;
    }

    if (json.activeFacets && json.activeFacets.length > 0) {
        createFacets(json.activeFacets, chatKey,template);
    }

    console.log(`Execution time: ${(performance.now() - timeSend).toString()}`);
    template.refresh();
    sforce.console.setCustomConsoleComponentVisible(true);
}

function createSuggestions(json, chatKey, template) {
    let html = Array();
    html.push(`<div class="sectionHeader">Suggestions<i onclick="changeVisibilityClick(this,true)" class="visibiliteArrow fas ${COLLAPSE_ICON}"></i></div>`);
    html.push('<div class="allSuggestions">');
    json.forEach( (element) => {
        let excerpt =  element.excerpt || '';   
        let agentInput =  element.title + ' ' + element.uri;
        html.push(`<div class="suggestion" onclick="chooseSuggestionClick('${agentInput}','${chatKey}','${element.id}','suggestion')">`);
        html.push('<div class="content">');
        html.push(`<div class="title sentence">${element.title}</div>`);
        html.push(`<div class="excerpt">${excerpt}</div>`);
        html.push(`<a class="sentence url" href="#" onclick="openURL('${element.uri}')">${element.uri}</a>`);
        html.push('</div>');
        html.push('</div>');
    });

    html.push('</div>');
    template.suggestions.innerHTML += html.join("");
}

function createQuestions(json, chatKey, template) {
    let html = Array();
    html.push(`<div class="sectionHeader">Questions<i onclick="changeVisibilityClick(this,false)" class="visibiliteArrow fas ${COLLAPSE_ICON}"></i></div>`);
    html.push('<div class="allQuestions">');
    json.forEach( (element) => {
        html.push('<div class="question">');
        html.push(`<div class="questionRow" onclick="chooseSuggestionClick('${element.text}','${chatKey}','${element.id}','question')">${element.text}</div>`);
        html.push('</div>');
    });
    html.push('</div>');
    template.questions.innerHTML += html.join("");
}

function createFacets(json, chatKey, template) {
    let html = Array();
    html.push('<span class="filterHeader">Filters</span>');
    html.push('<span class="allFacet">');
    json.forEach( element => {
        html.push(`<span class="facet">`);
        html.push('<span style="color:black;"> | </span>');
        html.push(`<span>${element.name}: </span><span onclick="facetCancelClick('${chatKey}','${element.id}')">${element.value}</span>`);
        html.push(`<i class="fas fa-times"></i></span>`);
    });
    html.push('</span>');
    html.push(`<span class="clearButton" onclick="facetCancelClick('${chatKey}',null)"><i class="fas fa-times"></i>Clear All</span>`);
    template.facets.innerHTML +=  html.join("");
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
    sforce.console.chat.setAgentInput(chatKey, agentInput, setAgentInputSuccess);
}

function changeVisibilityClick(element,isSuggestion) {
    let classList = element.classList;
    // TODO Find a better solution that is more dynamic
    let elementToHandle = element.parentElement.nextSibling;

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