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
/**
 *
 * A simple wrapper for an ajax call with assembla headers for auth preloaded
 * @param url
 * @param method
 * @param callback
 * @constructor
 */
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
var Space = function(data){
    var self=this;
    this.id=data.id;
    this.name = data.name;
    this.merge_requests=[];
    this.tools=[];
    this.users=[];

    this.mergeRequestUserAdd = function(user){
        gitsembla.userSettings.users.push(user);
        var r = new RegExp("\{\{user-"+user.id+"\}\}","g");
        $("#container").html($("#container").html().replace(r, user.name));

    };
    this.getTools= function(){
        new GitsemblaRequest("https://api.assembla.com/v1/spaces/"+self.id+"/space_tools.json", "GET", self.setTools);
    };

    this.setTools =function(data){
        self.tools=data;
        self.getMergeRequests();
    };

    this.init = function(){
        self.getTools();
    };

    this.getMergeRequests  = function(){
        var git_tools= _.filter(self.tools, function(tool){
            return tool.type==="GitTool";
        });
        _.each(git_tools, function(tool){
            new GitsemblaRequest("https://api.assembla.com/v1/spaces/"+self.id+"/space_tools/"+tool.id+"/merge_requests.json?status=open", "GET", self.setMergeRequests);
        });
    };
    this.setMergeRequests = function(merge_requests){
        self.merge_requests=_.union(self.merge_requests, merge_requests);
        if (self.merge_requests.length>0){
            $("#accordion-"+self.id+" .panel").addClass("panel-danger").addClass("has_requests");
            $("#container").prepend($("#accordion-"+self.id))
        }
        $("#accordion-"+self.id+ " .merge_requests_count").text(self.merge_requests.length);
        _.each(merge_requests,function(merge_request){
            (function(merge_request){
                $("#collapse"+self.id+ " .panel-body .list-group").append('<li class="list-group-item"><span class="badge">{{user-'+merge_request.user_id+'}}</span>'+merge_request.title+'</li>');
                var foundUser=gitsembla.userSettings.getUserById(merge_request.user_id);
                if (foundUser===null){
                    new GitsemblaRequest("https://api.assembla.com/v1/users/"+merge_request.user_id, "GET", self.mergeRequestUserAdd);
                }else{
                    var r = new RegExp("\{\{user-"+foundUser.id+"\}\}","g");
                    $("#container").html($("#container").html().replace(r, foundUser.name));
                }
            })(merge_request);


        });
    }
    this.addUser = function(user){
        self.users.push(user);
    }
    this.init();
};
var Spaces = function (callback){
    var self= this;
    this.callback = callback;
    this.url ="https://api.assembla.com/v1/spaces.json";
    this.obj = null;
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
        var spaceObjs =new Spaces();
        spaceObjs.callback=function(){
            for (var spaceKey in gitsembla.userSettings.spaces){
                if (gitsembla.userSettings.spaces.hasOwnProperty(spaceKey)){
                    var tmpSpace=gitsembla.userSettings.spaces[spaceKey];
                    (function(tmpSpace){
                        gitsembla.userSettings.spaces[spaceKey]=new Space(tmpSpace);

                        var viewHtmlReturn= new ViewHtmlReturn("space.html",function(html){
                            html=html.replace("{{space_title}}",tmpSpace.name);
                            html=html.replace("{{space_id}}",tmpSpace.id);
                            html=html.replace("#accordion-{{space-id}}","#accordion-"+tmpSpace.id);
                            html=html.replace("accordion-{{space-id}}","accordion-"+tmpSpace.id);
                            html=html.replace("collapseOne","collapse"+tmpSpace.id);
                            $("#container").append(html);

                        });
                        viewHtmlReturn.load();
                    })(tmpSpace);
                }
            }
        };
        spaceObjs.get();

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
    this.users = [];
    this.getUserById = function (user_id){
        var found= _.find(self.users, function(user){
            return user.id ==user_id;
        });
        if (typeof(found)=="undefined" || found==null){
            return null;
        }else{
            return found;
        }
    };
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