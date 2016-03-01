#!/usr/bin/env node
'use strict';

var SiteIterator = require('../lib/site-iterator');
var program = require('commander');
var util = require('util');
var config = require('../lib/config');
var css = require('css');
var fs = require('fs');


program.version('0.0.1')
    .usage('[options] <path> <reference.css>')
    .description('Reports differences in a path\'s CSS files against a reference CSS file.')
    .option('--create-diff <output.css>', 'Creates a CSS file that includes the differences.')
    .option('--files', 'Only output file names that differ')
    .option('--classes', 'Only output classes that differ');

program.parse(process.argv);

if (program.args.length !== 2) {
    program.help();
}

var cssInputPath = program.args[0];
var cssReferenceFile = program.args[1];
var cssOutputFile = program.createDiff;

var dataReference = fs.readFileSync(cssReferenceFile, 'utf8');
var objReferenceFile = css.parse(dataReference,{ source: cssReferenceFile });
var rulesReference = objReferenceFile.stylesheet.rules;
var rulesReferenceArray =[];

var dataInput ='';
var objInputFile ='';
var rulesInput = '';

var selectorInput ='';
var selectorReference='';
    
var differentElementsArray=[];
var checkClasses ='';
var checkElements ='';
var checkProperties='';

var propertiesArray=[];

var outputText={};
var extraRuleArray =[];
var extraRulesArray =[];

var declarationArray =[];
var propertiesArray=[];
var extrafields ='';

var extraSelector ='';
//Gives array of all the properties of Reference File of specific class
var propertiesReferenceArray= function(inputClass) {
    var propertiesArray=[];
    
    rulesReference.forEach(function(ruleReference){
        if(ruleReference.selectors){
            var referenceClass = ''+ruleReference.selectors+'';  
            var propertiesReference = ruleReference.declarations;
            propertiesReference.forEach(function(propertyReference){
                if (referenceClass === inputClass) {
                    propertiesArray.push(propertyReference.property);
                }
            }); 
        }
    }); 
    return propertiesArray;
};
var getSelectorInput = function(elements){
    var type = elements.type;
    var selectorInput = {
       'media': elements.media,
       'keyframes':elements.name,
       'document':elements.document,
       'rule':''+elements.selectors+'',
       'page':''+elements.selectors+'',
       'supports':elements.supports,
       'font-face':'@font-face',
       'comment':'comment',
       'custom-media':'custom-media',
       'charset':'charset',
       'import':'import',
       'namespace':'namespace'
    };
    return selectorInput[type];
};
var getPropertiesInput=function(elements){
    var type = elements.type;
    var propertiesInput ={
       'media': elements.rules,
       'document':elements.rules,
       'supports':elements.rules,
       'keyframes':elements.keyframes,
       'rule':elements.declarations,
       'page':elements.declarations,
       'font-face':elements.declarations,
       'comment':elements.comment,
       'custom-media':elements.name,
       'charset':elements.charset,
       'import':elements.import,
       'namespace':elements.namespace
    };
    return propertiesInput[type];
};
var getExtrafields=function(elements){
    var type = elements.type;
    var extrafields ={
       'document':elements.vendor,
       'keyframes':elements.vendor,
       'custom-media':elements.media
    };
    return extrafields[type]; 
};
var getReferenceElements = function(){
    rulesReference.forEach(function(ruleReference){
        var nodeTypes = getSelectorInput(ruleReference);
        rulesReferenceArray.push(nodeTypes);
    });
    return rulesReferenceArray;
};

//Used to find array of different Files/Classes
var getElementsArray = function(propertiesInput, propertiesReference,inputElement,outputArray) {
    if(propertiesInput){
    propertiesInput.forEach(function(propertyInput){
        propertiesReference.forEach(function(propertyReference){
            checkElements = outputArray.indexOf(inputElement);
            if (propertyInput.property === propertyReference.property && propertyInput.value !== propertyReference.value && checkElements ===-1) {
                outputArray.push(inputElement);
            }
        });  
    }); 
}
    return outputArray;
};
//Used in finding different classes in different files and outputs according to the option given.
var getDifferentElements =function(input) {
    var defaultInput= '';
    
    var arrayReferenceClass=[];
    arrayReferenceClass = getReferenceElements();
    
    fs.readdir(cssInputPath,function(err,files){
        if (err) {throw err;}
        files.forEach(function(file){
            var checkCss = (/\.(css)$/i).test(file);
            if (checkCss===true) {
                dataInput = fs.readFileSync(cssInputPath+file, 'utf8');
                objInputFile = css.parse(dataInput,{ source: file }); 
                rulesInput = objInputFile.stylesheet.rules;
                rulesInput.forEach(function (ruleInput) {
                    selectorInput = getSelectorInput(ruleInput);
                    defaultInput = file+'('+ruleInput.position.start.line+'):'+selectorInput;
                    var inputElement={
                        'files': file,
                        'classes': selectorInput,
                        'default': defaultInput
                    };
                    checkClasses = arrayReferenceClass.indexOf(selectorInput);
                    checkElements = differentElementsArray.indexOf(inputElement[input]);
                    if (checkClasses === -1 && checkElements === -1) {
                        differentElementsArray.push(inputElement[input]); 
                    }else{
                        rulesReference.forEach(function (ruleReference) {
                            selectorReference = getSelectorInput(ruleReference);
                            if (selectorInput === selectorReference) {
                                var propertiesInput = ruleInput.declarations;
                                var propertiesReference = ruleReference.declarations;
                                differentElementsArray = getElementsArray(propertiesInput,propertiesReference,inputElement[input],differentElementsArray);
                                propertiesArray = propertiesReferenceArray(selectorInput);
                                if(propertiesInput){
                                    propertiesInput.forEach(function (propertyInput) {
                                        checkProperties = propertiesArray.indexOf(propertyInput.property);
                                        checkElements = differentElementsArray.indexOf(inputElement[input]);
                                        if (checkProperties === -1 && checkElements === -1) {
                                            differentElementsArray.push(inputElement[input]);
                                        }
                                    });
                                } 
                            }
                        });
                    }
                }); 
            }
        });
        console.log(differentElementsArray.join('\n'));
    }); 
};
//Returns single declaration, used for creating declaration array which is used further in addRule function.
var addDeclaration= function(propertyInput){
    var declarationOutput = {   
        'type': 'declaration',
        'property':propertyInput.property,
        'value': propertyInput.value
    };
    return declarationOutput;
};
var addFontFace= function(declarationArray){
    
  var fontFaceOutput={};
    fontFaceOutput={ 
        'type': 'font-face',
        'declarations': declarationArray
    };
    return fontFaceOutput;  
};
var addKeyFrame=function(value,declarationArray){
    var keyFrameOutput={}; 
    keyFrameOutput=  {
        'type': 'keyframe',
        'values': [value],
        'declarations': declarationArray
    };
    return keyFrameOutput;
};
var addCharset=function(charset){
    var charsetOutput={};
    charsetOutput={ 
        'type': 'charset',
        'charset': charset, 
        'position': {
            'start': {
                'line': 1,
                'column': 1
            },
            'end': {
                'line': 1,
                'column': 10
            }
        }
    };
    return charsetOutput;
};
var addDocument =function(document,vendor,rules){
   var documentOutput={};
    documentOutput= {
        'type': 'document',
        'document': document,
        'vendor':vendor,
        'rules': rules
      };
    return documentOutput;
};
var addImport=function(importUrl){
    var importOutput={};
    importOutput={ 
        'type': 'import',
        'charset': importUrl
    };
    return importOutput;
};
var addCustomMedia =function(name,media){
   var keyFramesOutput={};
    keyFramesOutput= {
        'type': 'custom-media',
        'name': name,
        'media':media
    };
    return keyFramesOutput;
};

var addNamespace=function(namespace){
    var namespaceOutput={};
    namespaceOutput={ 
        'type': 'namespace',
        'namespace': namespace
    };
    return namespaceOutput;
};
var addKeyFrames =function(name,vendor,keyframes){
    var keyFramesOutput={};
    keyFramesOutput= {
        'type': 'keyframes',
        'name': name,
        'vendor':vendor,
        'keyframes': keyframes
    };
    return keyFramesOutput;
};

var addComment =function(comment){
    var commentsOutput={};
    commentsOutput={ 
        'type': 'comment',
        'comment': comment
    };
    return commentsOutput;
    
};
//Returns single rule, used for creating rules array which is used further in returnOutput function to get the final output.
var addRule = function(selectorInput, declarationArray){
    var rulesOutput={};
    rulesOutput={ 
        'type': 'rule',
        'selectors': [selectorInput],
        'declarations': declarationArray
    };
    return rulesOutput;
};
var addPage = function(selectorInput, declarationArray){
    var pageOutput={};
    pageOutput={ 
        'type': 'rule',
        'selectors': [selectorInput],
        'declarations': declarationArray
    };
    return pageOutput;
};
var addMedia =function(media,rules) {
    var mediaOutput={};
    mediaOutput=  {
        'type': 'media',
        'media': media,
        'rules': rules
    };
    
    return mediaOutput;
};
 var addSupports =function(supports,rules) {
 var supportsOutput={};
 supportsOutput=  {
        'type': 'supports',
        'media': supports,
        'rules': rules
      };
      return supportsOutput;
 };
var returnOutput= function(rules) {
    var outputStyle={ 
        'type': 'stylesheet',
        'stylesheet': {
        'rules': rules
        }
    };
    return outputStyle;
};
var checkReferenceExtraRules = function(input){
    var arrayReferenceExtraRules=[];
    rulesReference.forEach(function(ruleReference){
        var inputReference = getSelectorInput(ruleReference);
        var extraRules = ruleReference.rules;
        if(inputReference === input){
            extraRules.forEach(function(extraRule){
                var extraRuleSelector = ''+extraRule.selectors+'';
                arrayReferenceExtraRules.push(extraRuleSelector);
            });
        }
    }); 
    return arrayReferenceExtraRules;
};
var checkReferenceExtraProperties =function(selInput, input){
    var arrayReferenceExtraProperties=[];
    rulesReference.forEach(function(ruleReference){
        var inputReference = getSelectorInput(ruleReference);
        var extraRules = ruleReference.rules;
        if(inputReference === selInput){
            extraRules.forEach(function(extraRule){
                var extraRuleSelector = ''+extraRule.selectors+'';
                if(extraRuleSelector === input){
                    var extraDeclarations = extraRule.declarations;
                    extraDeclarations.forEach(function(extraDeclaration){
                        arrayReferenceExtraProperties.push(extraDeclaration.property);
                    });
                }
            });
        }
    });
    return arrayReferenceExtraProperties;
}; 
var getDeclarationArray=function(propertiesInput){
    var declarationArray =[];
    var propertiesArray=[];
    propertiesInput.forEach(function (propertyInput) {
        var checkProperties = propertiesArray.indexOf(propertyInput.property);
        if(checkProperties === -1){
            declarationArray.push(addDeclaration(propertyInput)); 
            propertiesArray.push(propertyInput.property+':'+propertyInput.value);
        }   
    });
    return declarationArray;
};
var addingRules = function(selectorInput,propertiesInput,extrafields,elementType,functionType){
    if(elementType==='font-face' || elementType==='rule' || elementType==='page'){
        declarationArray = (functionType === 'main') ? getDeclarationArray(propertiesInput) : propertiesInput;
    }
    var addRules= {
       'media': addMedia(selectorInput,propertiesInput),
       'keyframes':addKeyFrames(selectorInput,extrafields,propertiesInput),
       'document':addDocument(selectorInput,extrafields,propertiesInput),
       'rule': addRule(selectorInput,declarationArray),
       'page':addPage(selectorInput,declarationArray),
       'supports':addSupports(selectorInput,propertiesInput),
       'font-face':addFontFace(declarationArray),
       'comment':addComment(propertiesInput),
       'custom-media':addCustomMedia(propertiesInput,extrafields),
       'charset':addCharset(propertiesInput),
       'import':addImport(propertiesInput),
       'namespace':addNamespace(propertiesInput)
    };
    return addRules[elementType];
};
var mergeExtraRules=function(text){
    var tempText ={};
    var rules =[];
    var rulesExtraArrayTemp=[];
    var rulesArray=[];
    var declarationPrettyArray =[];
    var propertiesPrettyArray=[];
    var addRules ='';
    var extraRulesArray =[];
    var extraRuleArray =[];
    var propertiesDeclarations =[];
    
    objInputFile = css.parse(text); 
    rulesInput = objInputFile.stylesheet.rules;
    rulesInput.forEach(function (ruleInput) {
        extraRulesArray=[];
        extraRuleArray=[];
        selectorInput = getSelectorInput(ruleInput);
        var propertiesInput = getPropertiesInput(ruleInput);
        extrafields = getExtrafields(ruleInput);
        if(getRuleType(ruleInput.type)!==1){
            addRules = addingRules(selectorInput,propertiesInput,extrafields,ruleInput.type,'main');
            rules.push(addRules);
            rulesArray.push(selectorInput);
        }else{
            rulesExtraArrayTemp = getrulesExtraArrayTemp(selectorInput,rulesInput); 
            selectorInput = getSelectorInput(ruleInput);
            rulesExtraArrayTemp.forEach(function (ruleExtraArrayTemp) {
                declarationPrettyArray=[];
                propertiesPrettyArray=[];
                propertiesInput.forEach(function (propertyInput) {  
                    extraSelector = ''+propertyInput.selectors+'';
                    propertiesDeclarations = propertyInput.declarations;
                    if(extraSelector === ruleExtraArrayTemp && util.isArray(propertiesDeclarations) === true){
                        propertiesDeclarations.forEach(function (propertyDeclarations) {
                            checkProperties = propertiesPrettyArray.indexOf(propertyDeclarations.property);
                            if(checkProperties === -1){
                                declarationPrettyArray.push(addDeclaration(propertyDeclarations)); 
                                propertiesPrettyArray.push(propertyDeclarations.property);
                            }
                        });
                        checkElements = extraRuleArray.indexOf(extraSelector);
                        if(checkElements === -1){
                            extraRulesArray.push(addRule(extraSelector,declarationPrettyArray));
                            extraRuleArray.push(extraSelector);
                        }
                    }
                });
            });
            checkClasses = rulesArray.indexOf(selectorInput);
            if(checkClasses===-1){
                addRules = addingRules(selectorInput,extraRulesArray,extrafields,ruleInput.type,'main');
                rules.push(addRules);
                rulesArray.push(selectorInput);    
            }
        }
    });
    tempText = returnOutput(rules);
    tempText = css.stringify(tempText);
    return tempText; 
};
var getrulesExtraArrayTemp =function(input,rulesInput){
    var rulesExtraArray=[];
    rulesInput.forEach(function (ruleInput) {    
        selectorInput = getSelectorInput(ruleInput);
        if(getRuleType(ruleInput.type)===1){   
            var propertiesInput = getPropertiesInput(ruleInput);
            if(input === selectorInput){
                propertiesInput.forEach(function (propertyInput) {
                    extraSelector = ''+propertyInput.selectors+'';
                    checkClasses = rulesExtraArray.indexOf(extraSelector);
                    if(checkClasses === -1 && propertyInput.type==='rule'){
                        rulesExtraArray.push(extraSelector);
                    }
                });
            }
        }
    }); 
    return rulesExtraArray;
};
var getRuleType= function(ruleType){
    var rulesType = {
        'media':1,
        'document':1,
        'supports':1,
        'keyframes':0,
        'rule':0,
        'page':0,
        'font-face':0,
        'comment':0,
        'custom-media':0,
        'charset':0,
        'import':0,
        'namespace':0
    };
    return rulesType[ruleType];
};
var getPrettyHtml= function(text){
    var tempText ={};
    var objCountRules = {};
    var rules =[];
    var rulesArrayTemp=[];
    var rulesExtraArrayTemp=[];
    var rulesArray=[];
    var declarationArray =[];
    var propertiesArray=[];
    var addRules ='';
    var countRule ='';
    var extraRulesArray =[];
    var extraRuleArray =[];
    
    objInputFile = css.parse(text); 
    rulesInput = objInputFile.stylesheet.rules;
    rulesInput.forEach(function (ruleInput) {
        selectorInput = getSelectorInput(ruleInput);
        var propertiesInput = getPropertiesInput(ruleInput);
        objCountRules[selectorInput] = objCountRules[selectorInput] ? objCountRules[selectorInput] + 1 : 1;
        var check = rulesArrayTemp.indexOf(selectorInput);
        if(check === -1){
            rulesArrayTemp.push(selectorInput);
        }
        if(util.isArray(propertiesInput) === true){
            rulesExtraArrayTemp = getrulesExtraArrayTemp(selectorInput,rulesInput);   
        }
    });
    rulesArrayTemp.forEach(function (ruleArrayTemp) {
        declarationArray =[];
        propertiesArray=[];
        extraRulesArray=[];
        extraRuleArray=[];
        rulesInput.forEach(function (ruleInput) {
            selectorInput = getSelectorInput(ruleInput);
            var propertiesInput = getPropertiesInput(ruleInput);
            extrafields = getExtrafields(ruleInput);
            if(ruleArrayTemp === selectorInput) {
                countRule = objCountRules[selectorInput];
                checkClasses = rulesArray.indexOf(selectorInput);
                if(countRule === 1 && checkClasses === -1 ) {
                    addRules = addingRules(selectorInput,propertiesInput,extrafields,ruleInput.type,'main');
                    rules.push(addRules);
                    rulesArray.push(selectorInput);
                }else{
                    propertiesInput.forEach(function (propertyInput) {
                        checkProperties = propertiesArray.indexOf(propertyInput.property);
                        if(checkProperties === -1){
                            declarationArray.push(addDeclaration(propertyInput)); 
                            propertiesArray.push(propertyInput.property);
                        }
                    });   
                    if(getRuleType(ruleInput.type)!==1 && checkClasses === -1){
                        addRules = addingRules(selectorInput,declarationArray,extrafields,ruleInput.type,'html');
                        rules.push(addRules);
                        rulesArray.push(selectorInput);
                    }else{ 
                        rulesExtraArrayTemp = getrulesExtraArrayTemp(selectorInput,rulesInput); 
                        selectorInput = getSelectorInput(ruleInput);
                        rulesExtraArrayTemp.forEach(function (ruleExtraArrayTemp) {
                            propertiesInput.forEach(function (propertyInput) {
                                extraSelector = ''+propertyInput.selectors+'';
                                var propertiesDeclarations = propertyInput.declarations; 
                                if(extraSelector === ruleExtraArrayTemp){
                                    extraRulesArray.push(addRule(extraSelector,propertiesDeclarations));
                                    extraRuleArray.push(extraSelector);
                                }
                            });
                        });
                        addRules = addingRules(selectorInput,extraRulesArray,extrafields,ruleInput.type,'main');
                        rules.push(addRules);
                        rulesArray.push(selectorInput);
                    }
                }
            }
        });
    });
    tempText = returnOutput(rules);
    tempText = css.stringify(tempText);
    return tempText;
};
var writeFile= function(file,text) {
   fs.writeFile(file, text, function(err) {
        if (err) {
            return console.log(err);
        }
    });
};

var addExtraRules=function(ruleInput){
    var addRules='';
    var extraPropertiesArray=[];
    var extraDeclarationArray=[];
    selectorInput = getSelectorInput(ruleInput);
    extrafields = getExtrafields(ruleInput);
    var propertiesInput = getPropertiesInput(ruleInput);
    checkClasses = getReferenceElements().indexOf(selectorInput);
    
    if(checkClasses === -1){
        addRules = addingRules(selectorInput,propertiesInput,extrafields,ruleInput.type,'main');
    }else{
        propertiesInput.forEach(function (propertyInput) {
            if(propertyInput.type === 'rule'){
                extraDeclarationArray=[];
                extraPropertiesArray=[];
                extraSelector = ''+propertyInput.selectors+'';
                var propertyInputExtra = propertyInput.declarations;
                var checkExtraRules = checkReferenceExtraRules(selectorInput).indexOf(extraSelector);
                if(checkExtraRules===-1){
                    propertyInputExtra.forEach(function (propInputExtra) {
                        extraDeclarationArray.push(addDeclaration(propInputExtra)); 
                        extraPropertiesArray.push(propInputExtra.property); 
                    });
                    extraRulesArray.push(addRule(extraSelector,extraDeclarationArray));
                    extraRuleArray.push(extraSelector);
                }else{
                    rulesReference.forEach(function (ruleReference) {
                        selectorReference = getSelectorInput(ruleReference);
                        var propertiesReference = getPropertiesInput(ruleReference);
                        var propertyInputExtra = propertyInput.declarations;
                        propertyInputExtra.forEach(function (propInputExtra) {
                            checkProperties = checkReferenceExtraProperties(selectorInput,extraSelector).indexOf(propInputExtra.property);
                            var checkPropertiesExist= extraPropertiesArray.indexOf(propInputExtra.property);
                            if(checkProperties === -1 && checkPropertiesExist === -1 ){
                                extraDeclarationArray.push(addDeclaration(propInputExtra)); 
                                extraPropertiesArray.push(propInputExtra.property); 
                                extraRulesArray.push(addRule(extraSelector,extraDeclarationArray));
                                extraRuleArray.push(extraSelector); 
                            }else{
                                propertiesReference.forEach(function (propertyReference) { 
                                    if(propertyReference.type === 'rule'){
                                        var propertiesRefExtra = propertyReference.declarations;
                                        propertiesRefExtra.forEach(function (propertyRefExtra) {
                                            if(propertyRefExtra.property === propInputExtra.property && propertyRefExtra.value !== propInputExtra.value){
                                                extraDeclarationArray.push(addDeclaration(propInputExtra)); 
                                                extraPropertiesArray.push(propInputExtra.property);
                                                extraRulesArray.push(addRule(extraSelector,extraDeclarationArray));
                                                extraRuleArray.push(extraSelector); 
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }); 
                }
            }   
        });
        addRules = addingRules(selectorInput,extraRulesArray,extrafields,ruleInput.type,'main');
    } 
    return addRules;
};
var createDiffFile = function() {
    var addRules='';
    var rules =[];
    var rulesArray=[];
    var declarationArray =[];
    var propertiesInput = '';
    var propertiesReference = '';
    var inputArray = '';
    var propertiesArrayReference =[];
    rulesReferenceArray = getReferenceElements();
    fs.readdir(cssInputPath,function(err,files){
        if (err) {throw err;}
        files.forEach(function(file){
            var checkCss = (/\.(css)$/i).test(file);
            if (checkCss === true) {
                fs.readFile(cssInputPath+file, {encoding: 'utf-8'}, function(err,dataInput){ 
                    objInputFile = css.parse(dataInput,{ source: file }); 
                    rulesInput = objInputFile.stylesheet.rules;
                    rulesInput.forEach(function (ruleInput) {
                        declarationArray =[];
                        selectorInput = getSelectorInput(ruleInput);
                        propertiesInput = getPropertiesInput(ruleInput);
                        extrafields = getExtrafields(ruleInput);
                        checkClasses = getReferenceElements().indexOf(selectorInput);
                        if(getRuleType(ruleInput.type)!==1){
                            if(checkClasses === -1){
                            addRules = addingRules(selectorInput,propertiesInput,extrafields,ruleInput.type,'main');
                            rules.push(addRules);
                            rulesArray.push(selectorInput);
                            }else{
                                rulesReference.forEach(function (ruleReference) {
                                    selectorReference = getSelectorInput(ruleReference);
                                    propertiesReference = getPropertiesInput(ruleReference);
                                    if(util.isArray(propertiesInput) === true && selectorInput === selectorReference){
                                        propertiesInput.forEach(function (propertyInput) {
                                            propertiesArrayReference = propertiesReferenceArray(selectorInput);
                                            checkProperties = propertiesArrayReference.indexOf(propertyInput.property);
                                            if(checkProperties=== -1){
                                                declarationArray.push(addDeclaration(propertyInput));
                                                addRules = addingRules(selectorInput,declarationArray,extrafields,ruleInput.type,'main');
                                                rules.push(addRules);
                                                rulesArray.push(selectorInput);
                                            }else{
                                                propertiesReference.forEach(function (propertyReference) {
                                                    if (propertyInput.property === propertyReference.property && propertyInput.value !== propertyReference.value) {
                                                        declarationArray.push(addDeclaration(propertyInput));
                                                        addRules = addingRules(selectorInput,declarationArray,extrafields,ruleInput.type,'main');
                                                        rules.push(addRules);
                                                        rulesArray.push(selectorInput);
                                                    }
                                                }); 
                                            }
                                        });
                                    }             
                                });
                            }
                        }else{
                            addRules = addExtraRules(ruleInput);
                            if(addRules){
                                rules.push(addRules);
                            }
                        }
                    });
                    outputText = returnOutput(rules);
                    outputText =  css.stringify(outputText);
                    outputText = getPrettyHtml(outputText);
                    outputText = mergeExtraRules(outputText);
                    writeFile(cssOutputFile,outputText);   
                });
            }
        });
        console.log('The process can take few minutes.'); 
    });
};
var getOptions = function(){
    var option='';
    if(program.files){
      option='files';
    }else if(program.classes){
      option='classes';
    }else if(program.createDiff){
      option='createDiff';
    }else{
      option='default';
    }  
    return option;
};
//Prepare your inputs and options ready for the work, validate your inputs.
var execute = function(/* your input and options */) {
    //Do all your processing here
    var options = getOptions();
    
    switch (options) {
        case 'files':
            getDifferentElements('files');
            break;
        case 'classes':
            getDifferentElements('classes');
            break;
        case 'createDiff':
            createDiffFile();
            break;
        default:
            getDifferentElements('default');
    }
};

execute(/* pass in your inputs and options */);

//var execute = function(toltoolConfig) {
//    var sites = SiteIterator(toltoolConfig);
//
//    var summary = {};
//    var total = 0;
//    if (program.local) {
//        program.partitions = [ os.hostname().split('.')[0] ];
//    }
//    sites.on('site', function(site) {
//        if (program.partitions && !~program.partitions.indexOf(site.partition_host.split('.')[0])) {
//            return;
//        }
//        if (program.args.length===0 || !!~program.args.indexOf(site.site_code)) {
//            total++;
//            if (program.summary) {
//                if (!summary[site.partition_host]) {
//                    summary[site.partition_host] = 1;
//                } else {
//                    summary[site.partition_host] += 1;
//                }
//            } else {
//                console.log(util.format('%s\t%s\t%s', site.site_code, site.site_name, site.partition_host));
//            }
//        }
//    });
//    sites.on('end', function() {
//        for (var partition in summary) {
//            console.log(util.format('%s\t%s', partition, summary[partition]));
//        }
//        console.log(util.format('%s\t%s', 'total', total));
//    });
//    sites.start();
//};

//config.create(function(error, settings) {
//    if (error) {
//        console.error(error);
//        process.exit(1);
//    }
//    execute(settings.get('toltool'));
//});