let dictionary = {
    "welcome $$0": {
        ar: "اهلا بك يا $$0",
        en: "welcome $$0"
    },
    "access denied !": {
        ar: "لا تمتلك صلاحية الوصول !",
        en: "access denied !"
    },
};


var langType = 'en';
function lang(newLangType) {
    langType = newLangType;
}
function translate(message){

    let returnMessage = "";

    returnMessage = (dictionary[message] && dictionary[message][langType])?
     dictionary[message][langType]:
     message;
    
    Object.values(arguments).forEach(function(arg, ind) {
        if(ind>0)
            returnMessage = returnMessage.replace("$$" + (ind - 1), arg);
    });
    return returnMessage;
}


exports.t = translate;
exports.lang = lang;