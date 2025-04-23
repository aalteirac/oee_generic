import ApexCharts from 'apexcharts';
import DataTable from '../components/data-table';
import {basicSetup} from "codemirror";
import {EditorView} from "@codemirror/view";
import {yaml} from "@codemirror/lang-yaml";
import dropdown from '../components/dropdown';
import toast from "../components/toast";


window.page2=async function(){
    fadeIn();
    feather.replace();    
    var curEditor;
    var curModel;
    var curModelSelected;
    window.modal.init();
    addModalAllListener();
    window.scrollDown=scrollDown;
    var curMessage='';
    dropdown.initOne('.dpd-model');
    dropdown.initOne('.dpd-model-active');
    setCurrentSelectedModel();
    populateDropdownActive();
    populateDropdown();
    isHistory();
    
    function fadeIn(){
        setTimeout(() => {
            document.querySelector('.loading').style.display='block';
            document.querySelector('.loading').classList.add('show');
        }, 300);
        setTimeout(() => {
            document.querySelectorAll('.ctent').forEach(el => {
                el.style.display = 'flex';
            });
            document.querySelector('.loading').style.display='none';
        }, 1500);
    }

    function isHistory(){
         let h=document.querySelectorAll('.accordion-item').length>0;
         if (h)
            document.querySelector('#histobtn').removeAttribute('disabled'); 
         return h;
    }

    async function populateDropdownActive() {
        let models = getSavedModels();
        if(models.length<1){
            let defaultModel=await getServerModel();
            saveSemModel(0,'Default Model',defaultModel.model);
            models = getSavedModels();
        }
        const dropdown = document.getElementById('model-list-active');
        dropdown.innerHTML = '';
        models.forEach(model => {
          const li = document.createElement('li');
          li.className = 'dropdown-list-item';
          const a = document.createElement('a');
          a.href = 'javascript:void(0)';
          a.className = 'dropdown-link model';
          a.textContent = model.name;
          a.setAttribute('data-ids', model.id);
          li.appendChild(a);
          dropdown.appendChild(li);
          a.onclick = () => {
            saveActiveModelID(model.id);
            curModelSelected=getSavedModelById(model.id);
            addSelectItem(curModelSelected.id,curModelSelected.name,'model-list-active','dpd-model-active','data-ids');
            document.querySelector('.model-container-active').classList.remove('show');
            feather.replace();
          };
        });
        if(!curModelSelected){
            curModelSelected=getSavedModelById(getMaxModelId());
            addSelectItem(getMaxModelId(),getSavedModelById(getMaxModelId()).name,'model-list-active','dpd-model-active','data-ids');
        }
        else{
            curModelSelected=getSavedModelById(curModelSelected.id);
            addSelectItem(curModelSelected.id,curModelSelected.name,'model-list-active','dpd-model-active','data-ids');
        }
    }

    function addSelectItem(id,name,list='model-list',dropd='dpd-model',dataid='data-id'){
        const links = document.getElementById(list).querySelectorAll('.dropdown-link.model');
        links.forEach(link => {
            link.innerHTML = link.textContent;
        });
        let a=document.querySelector(`[${dataid}="${id}"]`)
        a.innerHTML = `${name}<i class="w-4" data-feather="check"></i>`;
        feather.replace();
        document.querySelector(`.${dropd} .dropdown-toggle span`).innerText=name;
    }

    function isModifed(id){
        if(curEditor){
            return getSavedModelById(id).content!= curEditor.state.doc.toString()
        }
        else{
            return false;
        }
    }

    async function populateDropdown() {
        let models = getSavedModels();
        if(models.length<1){
            let defaultModel=await getServerModel();
            saveSemModel(0,'Default Model',defaultModel.model);
            loadEditor(defaultModel.model);
            models = getSavedModels();
        }
        else if (!curModel){
            loadEditor(getSavedModelById(getMaxModelId()).content);
        }
        const dropdown = document.getElementById('model-list');
        dropdown.innerHTML = '';
        models.forEach(model => {
          const li = document.createElement('li');
          li.className = 'dropdown-list-item';
          const a = document.createElement('a');
          a.href = 'javascript:void(0)';
          a.className = 'dropdown-link model';
          a.textContent = model.name;
          a.setAttribute('data-id', model.id);
          li.appendChild(a);
          dropdown.appendChild(li);
          a.onclick = () => {
            if(isModifed(curModel.id)){
                toast.warning('Changes not saved !!', {
                    gravity: 'top',
                    position: 'left'
                })
                document.querySelector('.model-container').classList.remove('show');
                return;
            }
            curModel=getSavedModelById(model.id);
            addSelectItem(curModel.id,curModel.name);
            loadEditor(curModel.content);
            document.querySelector('.model-container').classList.remove('show');
            feather.replace();
          };
        });
        if(!curModel){
            curModel=getSavedModelById(getMaxModelId());
            addSelectItem(getMaxModelId(),getSavedModelById(getMaxModelId()).name);
        }
        else{
            addSelectItem(curModel.id,curModel.name);
        }
    }

    function setCurrentSelectedModel(){
        let acc=getActiveModelID();
        if(acc!=null){
            if (getSavedModelById(parseInt(acc))!=null){
                curModelSelected=getSavedModelById(parseInt(acc));
            }
                
        }
    }

    function getActiveModelID(){
        return localStorage.getItem('activemodel')
    }

    function saveActiveModelID(id){
        localStorage.setItem('activemodel', id);
    }

    function getMaxModelId() {
        const models = getSavedModels();
        if (models.length === 0) return -1;
        return Math.max(...models.map(model => Number(model.id)));
    }

    function deleteModel(id) {
        let models = getSavedModels();
        models = models.filter(model => model.id !== id);
        localStorage.setItem('models', JSON.stringify(models));
    }

    function getSavedModelById(id) {
        const models = getSavedModels();
        return models.find(model => model.id === id) || null;
    }

    function getSavedModels() {
        const models = JSON.parse(localStorage.getItem('models')) || [];
        return models;
    }
      
    function saveSemModel(id, name, content) {
        const models = getSavedModels();
        const index = models.findIndex(model => model.id === id);
        if (index !== -1) {
            models[index] = { id, name, content };
        } else {
            models.push({ id, name, content });
        }
        localStorage.setItem('models', JSON.stringify(models));
    }
    
    function renameModel(id, newName) {
        const models = getSavedModels();
        const index = models.findIndex(model => model.id === id);
        if (index !== -1) {
            models[index].name = newName;
            localStorage.setItem('models', JSON.stringify(models));
        } else {
            console.warn(`Model with id "${id}" not found.`);
        }
    }

    async function getServerModel(){
        let mod=await fetch('api/model');
        const data = await mod.json();
        return data;
    }

    async function loadEditor(content){
        if (curEditor){
            curEditor.destroy();
        }
        curEditor = new EditorView({
            doc: content,
            parent: document.querySelector(".yeditor"),
            extensions: [basicSetup,yaml()]
        })
    }

    function addModalAllListener(){
        
        const renDone = document.querySelector('#ren-done')
        renDone.addEventListener('click', () => {
            let newn=document.getElementById('model-name-ipt').value;
            if(document.getElementById('model-name-ipt').getAttribute('rename')=="true"){
                if(newn!=""){
                    renameModel(curModel.id,newn);
                    curModel.name=newn;
                    populateDropdown();
                    populateDropdownActive();
                    window.modal.modals.find(m => m.modal.id === 'modal-rename').hide();
                }
            } else{
                if (newn!=""){
                    let id=getMaxModelId()+1;
                    saveSemModel(id,newn,'# YOUR NEW MODEL');
                    curModel=getSavedModelById(id)
                    loadEditor(curModel.content);
                    populateDropdown();
                    populateDropdownActive();
                    window.modal.modals.find(m => m.modal.id === 'modal-rename').hide();
                }
            }
           
        })
        const closeEdit = document.querySelector('#close-edit')
        closeEdit.addEventListener('click', () => {
            if(isModifed(curModel.id)){
                toast.warning('Changes not saved !!', {
                    gravity: 'top',
                    position: 'left'
                })
            }
            else{
                window.modal.modals.find(m => m.modal.id === 'modal-semantic').hide();
            }
            populateDropdownActive();
        })
        const saveModel = document.querySelector('#save-model')
        saveModel.addEventListener('click', () => {
            saveSemModel(curModel.id,curModel.name,curEditor.state.doc.toString());
            let models = getSavedModels();
            toast.success('Saved !!', {
                gravity: 'top',
                position: 'left'
            })
        })
        const addModel = document.querySelector('#add-model')
        addModel.addEventListener('click', () => {
            document.getElementById('model-name-ipt').value="New Model";
            document.getElementById('model-name-ipt').setAttribute('rename',false)
            window.modal.modals.find(m => m.modal.id === 'modal-rename').show();
        })
        const renModel = document.querySelector('#ren-model')
        renModel.addEventListener('click', () => {
            document.getElementById('model-name-ipt').setAttribute('rename',true)
            document.getElementById('model-name-ipt').value=curModel.name;
            window.modal.modals.find(m => m.modal.id === 'modal-rename').show();
        })
        const delModel = document.querySelector('#del-model')
        delModel.addEventListener('click', () => {
            deleteModel(curModel.id);
            if(curModelSelected && curModelSelected.id==curModel.id){
                curModelSelected=undefined;
            }
            curModel=undefined;
            populateDropdown();
        })
    }

    function scrollDown(){
        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: "smooth"
        });
    }

    function isDark(){
        return document.querySelector('.dark') !== null;
    }

    function makeid(length) {
        let result = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        const charactersLength = characters.length;
        let counter = 0;
        while (counter < length) {
          result += characters.charAt(Math.floor(Math.random() * charactersLength));
          counter += 1;
        }
        return result;
    }

    function addAccordionItem(title,query ,chartId,tb) {
        const accordionItem = document.createElement("div");
        accordionItem.classList.add("accordion-item");
        accordionItem.classList.add("active");
        
        accordionItem.innerHTML = `
            <button type="button" class="accordion-header">
                <span>${title}</span>
                <span class="accordion-icon">
                    <i class="ti ti-chevron-right"></i>
                </span>
            </button>
            <div class="accordion-body">
                <div class="accordion-content">
                    <div class="tabs">
                        <ul class="tabs-list">
                            <li class="tabs-item" id="tabs-item-${chartId}">
                                <button class="tabs-btn" id="tabs-btn-chart-${chartId}" data-panel-id="#tabs-chart-${chartId}" type="button">
                                    <span>Chart</span>
                                </button>
                            </li>
                            <li class="tabs-item">
                                <button id="tabs-btn-tb-${chartId}" class="tabs-btn" data-panel-id="#tabs-tb-${chartId}" type="button">
                                    <span>Data</span>
                                </button>
                            </li>
                            <li class="tabs-item">
                                <button class="tabs-btn" data-panel-id="#tabs-query-${chartId}" type="button">
                                    <span>Query</span>
                                </button>
                            </li>
                        </ul>
                        <div class="tabs-content">
                            <div id="tabs-tb-${chartId}" class="tabs-panel">
                                <div class="space-y-2">
                                    ${tb}
                                </div>
                            </div>  
                            <div id="tabs-chart-${chartId}" class="tabs-panel">
                                <div class="space-y-2">
                                    <div id="${chartId}" style="height:45vh"></div>
                                </div>
                            </div>
                            <div id="tabs-query-${chartId}" class="tabs-panel">
                                <div class="space-y-2">
                                    ${sqlToHtml(query)}
                                </div>
                            </div>      
                        </div>
                    </div> 
                </div>
            </div>
        `;
        document.querySelector("#queries").prepend(accordionItem);
        window.tabs.init();
        window.accordion.init();
        setTimeout(() => {
            document.querySelector('#histobtn').removeAttribute('disabled'); 
        }, 1500);
        new DataTable(document.querySelector(".dt"))
        setTimeout(() => {
            window.accordion.closeAll();
            window.accordion.openFirst();
        }, 50);
        

    }

    function isNumeric(value) {
        return value !== null && value !== '' && !isNaN(parseFloat(value)) && isFinite(value);
    }
      
    function inferKeys(data) {
        if (!data || data.length === 0) {
            return { xKey: null, yKey: null, error: "Data is empty." };
        }
    
        const sampleSize = Math.min(data.length, 20); 
        const keys = {}; 
        const firstRecordKeys = Object.keys(data.find(item => item && typeof item === 'object') || {});
    
        if (firstRecordKeys.length < 2) {
            return { xKey: null, yKey: null, error: "Data objects must have at least two keys." };
        }
    
        firstRecordKeys.forEach(key => {
            keys[key] = { numericCount: 0, stringCount: 0, otherCount: 0, type: 'mixed' };
            for (let i = 0; i < sampleSize; i++) {
                if (data[i] && data[i].hasOwnProperty(key)) {
                    const value = data[i][key];
                    if (isNumeric(value)) {
                        keys[key].numericCount++;
                    } else if (typeof value === 'string' && value.trim() !== '') {
                        keys[key].stringCount++;
                    } else if (value !== null && value !== undefined) {
                        keys[key].otherCount++; 
                    }
                }
            }
            const totalCount = keys[key].numericCount + keys[key].stringCount + keys[key].otherCount;
            if (totalCount === 0) {
                keys[key].type = 'unknown';
            } else if (keys[key].numericCount / totalCount > 0.7) { // Threshold for numeric
                keys[key].type = 'numeric';
            } else if ((keys[key].stringCount + keys[key].otherCount) / totalCount > 0.7) { // Threshold for non-numeric (treating string/other as potential category)
                keys[key].type = 'string'; // Treat 'other' as potential category/string for simplicity here
            } else {
                keys[key].type = 'mixed';
            }
            console.log(`[inferKeys] Key: ${key}, Type: ${keys[key].type} (N:${keys[key].numericCount}, S:${keys[key].stringCount}, O:${keys[key].otherCount})`);
        });
    
        const numericKeys = firstRecordKeys.filter(k => keys[k].type === 'numeric');
        const stringKeys = firstRecordKeys.filter(k => keys[k].type === 'string'); // Includes 'other' types considered categorical
    
        let inferredX = null;
        let inferredY = null;
    
        const commonYNames = ['value', 'count', 'amount', 'sales', 'y', 'data', 'percent', 'metric', 'score', 'result'];
        const commonXNames = ['category', 'label', 'name', 'x', 'id', 'date', 'timestamp', 'group', 'item', 'period'];
    
        const findBestMatch = (keyList, commonNames) => {
            for (const name of commonNames) {
                if (keyList.includes(name)) return name;
            }
            return keyList.length > 0 ? keyList[0] : null; // Default to first if no common name found
        };
    
        if (numericKeys.length === 1 && stringKeys.length === 1) {
            // Ideal case: One numeric, one string
            inferredY = numericKeys[0];
            inferredX = stringKeys[0];
        } else if (numericKeys.length >= 1 && stringKeys.length === 1) {
            // One string (X), multiple numerics (Y candidates)
            inferredX = stringKeys[0];
            inferredY = findBestMatch(numericKeys, commonYNames);
            console.warn(`[inferKeys] Multiple numeric keys found. Using "${inferredY}" as Y-axis.`);
        } else if (numericKeys.length === 1 && stringKeys.length >= 1) {
            // One numeric (Y), multiple strings (X candidates)
            inferredY = numericKeys[0];
            inferredX = findBestMatch(stringKeys, commonXNames);
            console.warn(`[inferKeys] Multiple string/category keys found. Using "${inferredX}" as X-axis.`);
        } else if (numericKeys.length >= 2 && stringKeys.length === 0) {
            // All numeric: Assume scatter/line. Look for 'x' and 'y'.
            const potentialX = numericKeys.includes('x') ? 'x' : findBestMatch(numericKeys.filter(k => k !== 'y'), commonXNames.filter(n => n === 'x' || n === 'timestamp' || n === 'date')); // Bias towards x, timestamp, date
            const potentialY = numericKeys.includes('y') ? 'y' : findBestMatch(numericKeys.filter(k => k !== potentialX), commonYNames);
    
            if (potentialX && potentialY) {
                inferredX = potentialX;
                inferredY = potentialY;
                console.warn(`[inferKeys] Only numeric keys found. Assuming "${inferredX}" is X and "${inferredY}" is Y for scatter/line.`);
            } else if (numericKeys.length >= 2) {
                inferredX = numericKeys[0]; // Fallback: first numeric as X
                inferredY = numericKeys[1]; // Fallback: second numeric as Y
                console.warn(`[inferKeys] Only numeric keys found, common names ('x'/'y') not detected clearly. Using first key "${inferredX}" as X and second key "${inferredY}" as Y.`);
            } else {
                // Should not happen if we checked for length >= 2 before, but safety check
                return { xKey: null, yKey: null, error: "Could not determine X and Y from numeric keys." };
            }
        } else if (numericKeys.length >= 1 && stringKeys.length >= 1) {
            // Ambiguous: Multiple numeric AND multiple string keys
            inferredY = findBestMatch(numericKeys, commonYNames);
            inferredX = findBestMatch(stringKeys, commonXNames);
            console.warn(`[inferKeys] Ambiguous: Multiple numeric AND string keys found. Best guess: X="${inferredX}", Y="${inferredY}". Review data structure if this is wrong.`);
        } else {
            // Could not find a suitable numeric key or other failure scenario
            return { xKey: null, yKey: null, error: "Could not reliably infer X and Y keys. Ensure data has at least one identifiable numeric key and one categorical/string key, or structure data with common names (e.g., 'category', 'value')." };
        }
    
        if (!inferredX || !inferredY) {
            return { xKey: null, yKey: null, error: "Failed to infer both X and Y keys." };
        }
    
        return { xKey: inferredX, yKey: inferredY, error: null };
    }

    function getApexSingle(elementId,data) {
        if (!data || data.length === 0 || typeof data[0] !== 'object') {
          console.error("Invalid data format. Expected an array with a single object.");
          return null;
        }
      
        const dataPoint = data[0];
        const label = Object.keys(dataPoint)[0];
        let value = dataPoint[label];
        value=parseFloat(value.toFixed(6));
      
        if (typeof label === 'undefined' || typeof value === 'undefined') {
          console.error("Invalid data structure. Object should have at least one key-value pair.");
          return null;
        }
      
        const options = {
          series: [value * 100],
          chart: {
            id:elementId,
            height: "100%",
            width:"100%",
            type: 'radialBar',
          },
          plotOptions: {
            radialBar: {
              hollow: {
                margin: 15,
                size: '50%',
                background: '#fff',
                position: 'front',
                dropShadow: {
                  enabled: true,
                  top: 3,
                  left: 0,
                  blur: 4,
                  color: 'rgba(1, 154, 154, 1)', 
                  opacity: 0.65
                }
              },
              dataLabels: {
                show: true,
                name: {
                  offsetY: -10,
                  show: true,
                  color: '#888',
                  fontSize: '18px'
                },
                value: {
                  formatter: function (val) {
                    return val + "%";
                  },
                  color: '#111',
                  fontSize: '30px',
                  show: true,
                }
              }
            }
          },
          fill: {
            opacity: 1,
            colors: ['rgba(1, 154, 154, 1)','rgba(1, 154, 154, 0.8)','rgba(1, 154, 154, 0.5)'],   
            style:"solid",
          },
          stroke: {
            lineCap: 'round'
          },
          labels: [label], 
        };
        return options;
    }

    function generateDynamicApexChart(elementId, data, preferredType = null) {
        // --- Basic Input Validation ---
        if (!Array.isArray(data) || data.length === 0) {
            console.error(`[generateDynamicApexChart] Error: Input data is not a valid non-empty array.`);
            return null;
        }
        
        const { xKey, yKey, error: keyError } = inferKeys(data);

    
        if (keyError) {
            console.log(`[generateDynamicApexChart] Key Inference shows only one value: ${keyError}`);
            return getApexSingle(elementId,data);
        }
        console.log(`[generateDynamicApexChart] Inferred Keys: X='${xKey}', Y='${yKey}'`);
    
        var axisStyle={ 
            fontSize:  '14px',
            fontWeight:'500',
            color:  isDark()? '#ffffff':"#334155"
        }
        // --- Analyze Data Types (using inferred keys) ---
        let isXNumeric = true;
        let isYNumeric = true;
        let hasNullY = false;
        const validData = data.filter(item => item !== null && typeof item === 'object');
    
        if (validData.length === 0) {
            console.error(`[generateDynamicApexChart] Error: No valid data objects found after filtering.`);
            return null;
        }
    
        // Check types based on the first few valid items using inferred keys
        let firstValidX = null;
        let firstValidY = null;
    
        for (let i = 0; i < validData.length; i++) {
            const item = validData[i];
            if (item && item.hasOwnProperty(xKey) && item[xKey] !== undefined && item[xKey] !== null) {
                if (firstValidX === null) firstValidX = item[xKey];
            }
            if (item && item.hasOwnProperty(yKey) && item[yKey] !== undefined) {
                if (item[yKey] === null) {
                    hasNullY = true;
                } else if (firstValidY === null) {
                    firstValidY = item[yKey];
                }
            }
        }
    
        isXNumeric = firstValidX !== null && isNumeric(firstValidX);
        isYNumeric = firstValidY !== null && isNumeric(firstValidY);
        
        if (firstValidY === null && !hasNullY) {
            console.warn(`[generateDynamicApexChart] Warning: All valid "${yKey}" values seem to be null or undefined.`);
            isYNumeric = false;
        }
    
        console.log(`[generateDynamicApexChart] Data Analysis (using inferred keys): isXNumeric=${isXNumeric}, isYNumeric=${isYNumeric}`);
    
        // --- Determine Chart Type ---
        let chartType = 'bar';
    
        if (!isYNumeric && !(preferredType === 'pie' || preferredType === 'donut')) {
            console.error(`[generateDynamicApexChart] Error: Inferred Y-axis data ("${yKey}") does not appear to be numeric. Cannot generate standard value-based charts.`);
            return null;
        }
    
        const validPreferredTypes = ['bar', 'line', 'scatter', 'pie', 'donut', 'area'];
        let usePreferred = preferredType && validPreferredTypes.includes(preferredType);
        
        if (isXNumeric && isYNumeric) {
            chartType = 'scatter';
            if (usePreferred && (preferredType === 'line' || preferredType === 'scatter')) {
            chartType = preferredType;
            } else if (usePreferred) {
                console.warn(`[generateDynamicApexChart] Warning: Preferred type '${preferredType}' may not be ideal for numeric X and Y data (inferred keys: X='${xKey}', Y='${yKey}'). Defaulting to 'scatter'. Provide 'line' or 'scatter' to override.`);
            }
        } else if (!isXNumeric && isYNumeric) {
            chartType = 'bar';
            const categoryCount = new Set(validData.map(item => item[xKey])).size;
        
            if (usePreferred) {
                if (preferredType === 'scatter') {
                    console.warn(`[generateDynamicApexChart] Warning: Preferred type 'scatter' requires numeric X-axis data (inferred X='${xKey}' is not numeric). Defaulting to 'bar'.`);
                } else if ((preferredType === 'pie' || preferredType === 'donut') && categoryCount > 15) {
                    console.warn(`[generateDynamicApexChart] Warning: Preferred type '${preferredType}' is not recommended for a large number of categories (${categoryCount}). Defaulting to 'bar'.`);
                    chartType = 'bar';
                }
                else if (validPreferredTypes.includes(preferredType)) {
                    chartType = preferredType;
                }
            }
        }
    
        console.log(`[generateDynamicApexChart] Decided chart type: ${chartType}`);
    
        // --- Prepare ApexCharts Options (using inferred xKey, yKey) ---
        let options = {
            chart: {
                type: chartType,
                id:elementId,
                height: "100%",
                width:"100%",
                zoom: { enabled: chartType === 'line' || chartType === 'area' || chartType === 'scatter' }
            },
            series: [],
            xaxis: {
                title: { 
                    style: axisStyle
                }
            },
            yaxis: { 
                title: { 
                    text: yKey, 
                    style: axisStyle
                } 
            }, 
            noData: { text: "Loading or No Data..." }
        };
    
        // --- Configure options based on chart type and data ---
        try {
            if (chartType === 'bar' || chartType === 'line' || chartType === 'area') {
                options.series = [{
                    name: yKey,
                    data: validData.map(item => isNumeric(item[yKey]) ? Number(item[yKey]) : (item[yKey] === null ? null : 0)) 
                }];
                options.xaxis = {
                    categories: validData.map(item => item[xKey] ?? 'N/A'),
                    title: { text: xKey,
                             style: axisStyle
                    }
                };
                if (chartType === 'bar') options.plotOptions = { bar: { horizontal: false, columnWidth: '75%' } };
                if (chartType === 'line' || chartType === 'area') {
                    options.stroke = { curve: 'smooth' };
                    if (hasNullY) options.markers = { size: 4 };
                }
        
            } else if (chartType === 'scatter') {
                options.series = [{
                name: `${yKey} vs ${xKey}`,
                data: validData
                        .filter(item => item && item.hasOwnProperty(xKey) && item.hasOwnProperty(yKey) && isNumeric(item[xKey]) && isNumeric(item[yKey])) 
                        .map(item => ({ x: Number(item[xKey]), y: Number(item[yKey]) }))
                }];
                options.xaxis = {
                    type: 'numeric',
                    title: { text: xKey, 
                             style: axisStyle
                    },
                    tickAmount: 10,
                    labels: { formatter: val => typeof val === 'number' ? val.toFixed(1) : val }
                };
                options.yaxis.labels = { formatter: val => typeof val === 'number' ? val.toFixed(1) : val };
                options.tooltip = {
                    x: { formatter: val => `${xKey}: ${typeof val === 'number' ? val.toFixed(2) : val}` },
                    y: { formatter: val => `${yKey}: ${typeof val === 'number' ? val.toFixed(2) : val}` }
                };
        
            } else if (chartType === 'pie' || chartType === 'donut') {
                options.series = validData.map(item => isNumeric(item[yKey]) ? Number(item[yKey]) : 0);
                options.labels = validData.map(item => item[xKey] ?? 'N/A');
                options.yaxis = {};
                options.xaxis = {};
                options.legend = { position: 'bottom' };
                options.responsive = [{ breakpoint: 480, options: { chart: { width: '100%' }, legend: { position: 'bottom' } } }];
            }
        
        } catch (error) {
            console.error(`[generateDynamicApexChart] Error processing data for chart type ${chartType}:`, error);
            return null;
        }
    

        try {
            console.log(`[generateDynamicApexChart] Successfully rendered ${chartType} chart (X='${xKey}', Y='${yKey}')`);
            return options;
        } catch (error) {
            console.error(`[generateDynamicApexChart] Error rendering ApexChart:`, error);
            return null;
        }
    }

    function drawHistory(jsonData,q,tb){
        if(jsonData.length<1){
            let hq=sqlToHtml(q)
            document.getElementById("genie").addMessage({html:"Query returned no result: "+hq, role: 'ai'});
        }
        else{
            const allKeys = Object.keys(jsonData[0]); 
            const categoryKey = allKeys.find(k => typeof jsonData[0][k] === 'string'); 
            const valueKeys = allKeys.filter(k => k !== categoryKey && typeof jsonData[0][k] === 'number'); 
            const categories = categoryKey !=undefined?jsonData.map(row => row[categoryKey]):undefined
            const series = valueKeys.map(key => ({
                name: key,
                data: jsonData.map(row => row[key])
            }));
            let id=makeid(10);
            let opt=generateDynamicApexChart(id,jsonData);

            addAccordionItem(curMessage,q,id,tb);

            try {
                const chart = new ApexCharts(document.querySelector("#"+id), opt);
                chart.render();
                document.querySelector(`#tabs-chart-${id}`).classList.add("active");
                document.querySelector(`#tabs-btn-chart-${id}`).classList.add("active");
            } catch (error) {
                document.querySelector(`#tabs-chart-${id}`).style.display = "none";
                document.querySelector(`#tabs-item-${id}`).style.display = "none";
                console.log("ADD ACTIVE CATCH")
                document.querySelector(`#tabs-tb-${id}`).classList.add("active");
                document.querySelector(`#tabs-btn-tb-${id}`).classList.add("active");
            }
        }
        
    }

    function createDynamicTable(data) {
        if (data.length === 0) return "<p>No data available</p>"; 
        if (data.message){
            var msg=data.message;
            if (data.err && data.err.message)
                msg=msg+ ': '+ data.err.message

            document.getElementById("genie").addMessage({html:msg, role: 'ai'});
            return;
        }
        const columns = Object.keys(data[0]); 
        let tableHtml = '<table class="table dt">';
        tableHtml += "<thead><tr>";
        columns.forEach(col => {
            tableHtml += `<th>${col}</th>`;
        });
        tableHtml += "</tr></thead>";
        tableHtml += "<tbody>";
        data.forEach(rowData => {
            tableHtml += "<tr>";
            columns.forEach(col => {
                tableHtml += `<td>${rowData[col] !== undefined ? rowData[col] : ""}</td>`;
            });
            tableHtml += "</tr>";
        });
        tableHtml += "</tbody>";

        tableHtml += "</table>";
        return tableHtml;
    }

    function _sendQuery(q){
        return new Promise((resolve, reject) => {
            fetch('api/query', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                  q: q
              })
            })
            .then(response => response.json())
            .then(data => resolve((data)))
            .catch(error => reject( error));
          })
    }

    async function sendQuery(q){
        document.getElementById("genie").addMessage({text:"Executing the proposed query...", role: 'ai'});
        scrollDown();
        let data=await _sendQuery(q);
        let tb=createDynamicTable(data)
        if (tb==undefined)
            return;
        setTimeout(() => {
            document.getElementById("genie").addMessage({html:"I show you insights very soon... ", role: 'ai'});
            scrollDown();
        }, 100);
        setTimeout(() => {
            window.modal.modals.find(m => m.modal.id === 'modal-history').show();
            drawHistory(data,q,tb);
        }, 2000);

    }

    window.sendQuery=sendQuery;

    function sqlToHtml(sql) {
        const keywords = ['SELECT', 'WITH', 'MIN', 'MAX', 'AS', 'FROM', 'WHERE', 'JOIN'];
        keywords.forEach(keyword => {
          const regex = new RegExp(`\\b${keyword}\\b`, 'g');
          sql = sql.replace(regex, ` <span class="sql-hl-keyword">${keyword}</span> `);
        });
      
        let e= sql
          .replace(/\n/g, '<br>')
          .replace(/ {2}/g, '&nbsp;&nbsp;'); 
          return `<pre style="white-space: break-spaces;">${e}</pre>`
    }

    var chat=document.getElementById("genie");

    document.getElementById("clearmess").addEventListener('click', function () {
        chat.clearMessages(false);
      });

    if(chat){
        chat.additionalBodyProps=`[{"IDWS":${window.IDWS}}]`
        chat.addEventListener('new-message', (event) => { 
            scrollDown();
            if(event.detail.message.role=='user')
                curMessage=event.detail.message.text;

        });
        chat.requestInterceptor = (requestDetails) => {
            requestDetails.body.IDWS=window.IDWS;
            requestDetails.body.model=curModelSelected.content
            return requestDetails;
          };
        chat.responseInterceptor = (response) => {
            return {"html":'<div class="loading-message-dots"></div>',role: 'ai'}
        };
    }  
}






