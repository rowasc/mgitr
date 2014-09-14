window['gitsembla']= {};
gitsembla["localScope"]={};

/**
 *
 * A simple wrapper for an ajax call with assembla headers for auth preloaded
 * @param url
 * @param method
 * @param callback
 * @constructor
 */
gitsembla.localScope["GitsemblaRequest"]= function (url, method, callback){
    $("#container").prepend('<span class="loading glyphicon glyphicon-cloud">loading...</span>');
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
        $("#container").find('.loading').fadeOut(1000).remove();

        callback(data);
    });
};
gitsembla.localScope["Space"] = function(data){

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
        new gitsembla.localScope.GitsemblaRequest("https://api.assembla.com/v1/spaces/"+self.id+"/space_tools.json", "GET", self.setTools);
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
            new gitsembla.localScope.GitsemblaRequest("https://api.assembla.com/v1/spaces/"+self.id+"/space_tools/"+tool.id+"/merge_requests.json?status=open", "GET", self.setMergeRequests);
        });
    };
    this.setMergeRequests = function(merge_requests){
        self.merge_requests=_.union(self.merge_requests, merge_requests);
        if (self.merge_requests.length>0){
            $(".panel-"+self.id).removeClass("hide");
            $(".panel-"+self.id).addClass("panel-danger").addClass("has_requests");
            $("#container").prepend($(".panel-"+self.id))
        }
        $(".panel-"+self.id+ " .merge_requests_count").text(self.merge_requests.length);
        _.each(merge_requests,function(merge_request){
            (function(merge_request){
                $("#collapse"+self.id+ " .panel-body .list-group").append('<li class="list-group-item"><span class="badge">{{user-'+merge_request.user_id+'}}</span><a target="_blank" href="https://www.assembla.com/code/'+self.id+'/git/merge_requests/'+merge_request.id+'">'+merge_request.title+'</a></li>');
                var foundUser=gitsembla.userSettings.getUserById(merge_request.user_id);
                if (foundUser===null){
                    new gitsembla.localScope.GitsemblaRequest("https://api.assembla.com/v1/users/"+merge_request.user_id, "GET", self.mergeRequestUserAdd);
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
gitsembla.localScope["Spaces"] = function (callback){
    var self= this;
    this.callback = callback;
    this.url ="https://api.assembla.com/v1/spaces.json";
    this.obj = null;
    this.get = function(){
        new gitsembla.localScope.GitsemblaRequest (self.url, "GET", self.setup);
    };
    this.setup= function(data){
        gitsembla.userSettings.spaces=data;
        self.callback();
    };

};

gitsembla.localScope["ViewHtmlReturn"] = function(view, onViewLoad){
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

gitsembla.localScope["View"] = function(view, container, onViewLoad){
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
gitsembla.localScope["AssemblaForm"] = function(){
    var self=this;
    this.getData= function(){
        $("#btn-save-assembla").on("click", function(){
            gitsembla.userSettings.setApiIdentifier($("[name='identifier']").val());
            gitsembla.userSettings.setApiSecret($("[name='secret']").val());

            new gitsembla.localScope.SpaceList();

        });
    };
    this.getData();
};

/**
 * DOM data helper, get assembla user data
 * @constructor
 */
gitsembla.localScope["SpaceList"]= function(){
    $("#container").html('<div class="panel-group" id="accordion"></div>');
    var self=this;
    this.getData= function(){
        var spaceObjs =new gitsembla.localScope.Spaces();
        spaceObjs.callback=function(){
            for (var spaceKey in gitsembla.userSettings.spaces){
                if (gitsembla.userSettings.spaces.hasOwnProperty(spaceKey)){
                    var tmpSpace=gitsembla.userSettings.spaces[spaceKey];
                    (function(tmpSpace){
                        gitsembla.userSettings.spaces[spaceKey]=new gitsembla.localScope.Space(tmpSpace);

                        var viewHtmlReturn= new gitsembla.localScope.ViewHtmlReturn("space.html",function(html){
                            html=html.replace("{{space_title}}",tmpSpace.name);
                            html=html.replace("panel-{{space-id}}","panel-"+tmpSpace.id);
                            html=html.replace("{{space_id}}",tmpSpace.id);
                            html=html.replace("collapseOne","collapse"+tmpSpace.id);
                            html=html.replace("collapse{{space_id}}","collapse"+tmpSpace.id);
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
gitsembla.localScope["UserSettings"] = function(){
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
        return (self.getIdentifier()!=="undefined" && self.getIdentifier()!==null && self.getSecret()!=="undefined" && self.getSecret()!==null);
    }
};

$(document).ready(function(){
    gitsembla.init = function(){

        window['gitsembla'].userSettings = new gitsembla.localScope.UserSettings();

        gitsembla.userSettings.getIdentifier(gitsembla.userSettings.getSecret);

        if (gitsembla.userSettings.isIdentified()!==true){
            var assemblaForm = new gitsembla.localScope.View("assembla_form.html", "#container", gitsembla.localScope.AssemblaForm);
            assemblaForm.load();
        }else{
            new gitsembla.localScope.SpaceList();
            $("#container").html('<div class="panel-group" id="accordion"></div>');
        }
    };
    gitsembla.init();
    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            if (request.msg == "init")
                gitsembla.init();
    });
});
