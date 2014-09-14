$(document).ready(function(){
    window['gitsembla']= {};
    window['gitsembla'].userSettings = new UserSettings();

    gitsembla.userSettings.getIdentifier(gitsembla.userSettings.getSecret);

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
            xhr.setRequestHeader("X-Api-Key", gitsembla.userSettings.getIdentifier());
            xhr.setRequestHeader("X-Api-Secret",gitsembla.userSettings.getSecret());
        }
    }).done(function( data ) {
        callback(data);
    });
};

var Space = function (callback){
    var self= this;
    this.callback = callback;
    this.url ="https://api.assembla.com/v1/spaces.json";
    this.get = function(){
        new GitsemblaRequest (self.url, "GET", self.setup);
    };
    this.setup= function(data){
        gitsembla.userSettings.spaces=data;
        self.callback();
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

            new SpaceList();

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
        var s =new Space();
        s.callback=function(){
            for (var spaceKey in gitsembla.userSettings.spaces){
                if (gitsembla.userSettings.spaces.hasOwnProperty(spaceKey)){
                    var tmpSpace=gitsembla.userSettings.spaces[spaceKey];
                    (function(tmpSpace){
                        var v= new ViewHtmlReturn("space.html",function(html){
                            html=html.replace(/\{\{space_title\}\}/g,tmpSpace.name);
                            html=html.replace(/\{\{{{space_text}}\}\}/g,"");
                            html=html.replace(/\{\{{{space_merge_requests}}\}\}/g,"");
                            $("#container").append(html);
                        });
                        v.load();
                    })(tmpSpace);
                }
            }
        };
        s.get();

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
        localStorage.setItem('assembla_key_secret', secret);

    };
    this.setApiIdentifier = function(identifier){
        localStorage.setItem('assembla_key_identifier', identifier);

    };

    this.getSecret = function(){
        return localStorage.getItem('assembla_key_secret');


    };

    this.getIdentifier = function(){
        return localStorage.getItem('assembla_key_identifier');

    };

    this.isIdentified = function(){


        return (self.getIdentifier()!==null && self.getSecret()!==null);
    }
};