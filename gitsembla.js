$(document).ready(function(){
    window['gitsembla']= {};
    window['gitsembla'].userSettings = new UserSettings();

    if (gitsembla.userSettings.isIdentified()!==true){
        var assemblaForm = new View("assembla_form.html", "#container", AssemblaForm);
        assemblaForm.load();
    }else{
        new SpaceList();
    }

});

var GitsemblaRequest = function (url, method, callback){
    $.ajax({
        url: url,
        xhrFields: {
            withCredentials: true
        },
        beforeSend: function( xhr ) {
            xhr.setRequestHeader("X-Api-Key", gitsembla.userSettings.identifier);
            xhr.setRequestHeader("X-Api-Secret",gitsembla.userSettings.secret);
        }
    }).done(function( data ) {
        callback(data);
    });
};

var Space = function (callback){
    var self= this;
    this.url ="https://api.assembla.com/v1/spaces.json";
    this.get = function(){
        new GitsemblaRequest (self.url, "GET", self.setup);
    };
    this.setup= function(data){
        gitsembla.userSettings.spaces=data;
    };

};

var ViewHtmlReturn = function(view, onViewLoad){
    var self=this;
    this.onViewLoad= onViewLoad;
    this.view = view;
    this.container = typeof(container)==="undefined" ? "#container":container;
    this.load=function(){
        $.get(self.view, function(data){
            self.onViewLoad(data);
        });

    };
};

var View = function(view, container, onViewLoad){
    var self=this;
    this.onViewLoad= onViewLoad;
    this.view = view;
    this.container = typeof(container)==="undefined" ? "#container":container;
    this.load=function(){
        $(self.container).load(self.view, function(){
            self.onViewLoad();
        });
    };
    this.clearContainer=function(){
        $(self.container).html();
    };
};

/**
 * DOM data helper, get assembla user data
 * @constructor
 */
var AssemblaForm = function(){
    var self=this;
    this.getData= function(){
        $("#btn-save-assembla").on("click", function(){
            gitsembla.userSettings.setApiIdentifier($("[name='identifier']").val());
            gitsembla.userSettings.setApiSecret($("[name='secret']").val());

            new Space(SpaceList).get();

        });
    };
    this.getData();
};

/**
 * DOM data helper, get assembla user data
 * @constructor
 */
var SpaceList= function(){
    var self=this;
    this.getData= function(){
        new Space().get(function(){
            for (var spaceKey in gitsembla.userSettings.spaces){
                if (gitsembla.userSettings.spaces.hasOwnProperty(spaceKey)){
                    new ViewHtmlReturn("space.html",function(html){
                        html=html.replace(/\{\{space_title\}\}/g, gitsembla.userSettings.spaces[spaceKey].name);
                        html=html.replace(/\{\{{{space_text}}\}\}/g,"");
                        html=html.replace(/\{\{{{space_merge_requests}}\}\}/g,"");
                        $("#container").append(html);
                    });
                }
            }
        });
    };
    this.getData();
};
/**
 * Models
 * @constructor
 */
var UserSettings = function(){
    var self=this;
    this.secret=null;
    this.identifier=null;
    this.spaces = [];
    this.setApiSecret=function(secret){
      chrome.storage.local.set({'assembla_key_secret': secret}, function(data) {
          // Notify that we saved.
        self.getSecret();
      });
    };
    this.setApiIdentifier = function(identifier){
      chrome.storage.local.set({'assembla_key_identifier': identifier}, function(data) {
          self.getIdentifier();
      });
    };

    this.getSecret = function(){

      chrome.storage.local.get("assembla_key_secret", function(data_get){

            self.secret=data_get.assembla_key_secret;
      });

    };

    this.getIdentifier = function(){

        chrome.storage.local.get("assembla_key_identifier", function(data_get){
            self.identifier=data_get.assembla_key_identifier;
        });
    };

    this.isIdentified = function(){
        return (self.secret!==null && self.identifier!==null);
    }
};