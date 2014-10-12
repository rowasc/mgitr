window['mgitr']= {};

mgitr["localScope"]={};
mgitr.localScope.pinAuth={};


/**
 *
 * A simple wrapper for an ajax call with assembla headers for auth preloaded
 * @param url
 * @param method
 * @param callback
 * @constructor
 */
mgitr.localScope["mgitrRequest"]= function (url, method, callback,authHeaders,params){
    $("#container").prepend('<span class="loading glyphicon glyphicon-cloud">loading...</span>');
  if (typeof(authHeaders)==="undefined"){
    authHeaders=true;
  }
    $.ajax({
        url: url,
        data:params,
        method:method,
        beforeSend: function( xhr ) {
            if (authHeaders===true){
              xhr.setRequestHeader("Authorization", "Bearer "+mgitr.userSettings.getAssemblaAuthData().access_token);
            }

        }
    }).done(function( data ) {
        $("#container").find('.loading').fadeOut(1000).remove();

        callback(data);
    });
};

mgitr.localScope["Space"] = function(data){

    var self=this;
    this.id=data.id;
    this.name = data.name;
    this.merge_requests=[];
    this.tools=[];
    this.users=[];

    this.mergeRequestUserAdd = function(user){
        mgitr.userSettings.users.push(user);
        var r = new RegExp("\{\{user-"+user.id+"\}\}","g");
        $("#container").html($("#container").html().replace(r, user.name));

    };
    this.getTools= function(){
        new mgitr.localScope.mgitrRequest("https://api.assembla.com/v1/spaces/"+self.id+"/space_tools.json", "GET", self.setTools);
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
            new mgitr.localScope.mgitrRequest("https://api.assembla.com/v1/spaces/"+self.id+"/space_tools/"+tool.id+"/merge_requests.json?status=open", "GET", self.setMergeRequests);
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
                var foundUser=mgitr.userSettings.getUserById(merge_request.user_id);
                if (foundUser===null){
                    new mgitr.localScope.mgitrRequest("https://api.assembla.com/v1/users/"+merge_request.user_id, "GET", self.mergeRequestUserAdd);
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
mgitr.localScope["Spaces"] = function (callback){
    var self= this;
    this.callback = callback;
    this.url ="https://api.assembla.com/v1/spaces.json";
    this.obj = null;
    this.get = function(){
        new mgitr.localScope.mgitrRequest (self.url, "GET", self.setup);
    };
    this.setup= function(data){
        mgitr.userSettings.spaces=data;
        self.callback();
    };

};

mgitr.localScope["ViewHtmlReturn"] = function(view, onViewLoad){
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

mgitr.localScope["View"] = function(view, container, onViewLoad){
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
mgitr.localScope["AssemblaForm"] = function(){
    var self=this;
    this.getData= function(){
      $("#identifier").on("focusout", function(){
        mgitr.userSettings.setApiIdentifier($("[name='identifier']").val());
      });
      $("#secret").on("focusout", function(){
        mgitr.userSettings.setApiSecret($("[name='secret']").val());
      });

      $("#identifier").val(mgitr.userSettings.getIdentifier());
      $("#secret").val(mgitr.userSettings.getSecret());

      $("#btn-save-assembla").on("click", function(){
        mgitr.userSettings.setApiIdentifier($("[name='identifier']").val());
        mgitr.userSettings.setApiSecret($("[name='secret']").val());
        mgitr.localScope.PinAuthFlow(new mgitr.localScope.SpaceList);

      });
    };
    this.getData();
};

/**
 * DOM data helper, get assembla user data
 * @constructor
 */
mgitr.localScope["SpaceList"]= function(){
    $("#container").html('<div class="panel-group" id="accordion"></div>');
    var self=this;
    this.getData= function(){
        var spaceObjs =new mgitr.localScope.Spaces();
        spaceObjs.callback=function(){
            for (var spaceKey in mgitr.userSettings.spaces){
                if (mgitr.userSettings.spaces.hasOwnProperty(spaceKey)){
                    var tmpSpace=mgitr.userSettings.spaces[spaceKey];
                    (function(tmpSpace){
                        mgitr.userSettings.spaces[spaceKey]=new mgitr.localScope.Space(tmpSpace);

                        var viewHtmlReturn= new mgitr.localScope.ViewHtmlReturn("space.html",function(html){
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
mgitr.localScope["UserSettings"] = function(){
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
    this.setAssemblaAuthData= function(data){
      localStorage.setItem('assembla_auth_data', JSON.stringify(data));

    };

    this.getSecret = function(){
        return localStorage.getItem('assembla_key_secret');


    };

    this.getIdentifier = function(){
        return localStorage.getItem('assembla_key_identifier');

    };


  this.getAssemblaAuthData = function(){
    return JSON.parse(localStorage.getItem('assembla_auth_data'));

  };

    this.isIdentified = function(){
        return (self.getIdentifier()!=="undefined" && self.getIdentifier()!=="" && self.getIdentifier()!==null && self.getSecret()!=="undefined" && self.getSecret()!=="" && self.getSecret()!==null);
    }
};

window['mgitr'].userSettings = new mgitr.localScope.UserSettings();
mgitr.userSettings.getIdentifier(mgitr.userSettings.getSecret);


/**
 * Pin authroization for mgitr
 * @param data
 */
mgitr.localScope['PinAuthFlow']=new function(callbackAfterPinFlow){
  var pinCodeUse=function(pincode){
    var url = "https://"+mgitr.userSettings.getIdentifier()+":"+mgitr.userSettings.getSecret()+"@api.assembla.com/token?grant_type=pin_code&pin_code="+($(pincode).find("#content .box h1").text().toString().trim());
    var postPinFlow=function(pinFlow){
      mgitr.userSettings.setAssemblaAuthData(pinFlow);
      callbackAfterPinFlow();
    }
    mgitr.localScope.mgitrRequest(url,"POST", postPinFlow, true,{client_id:mgitr.userSettings.getIdentifier()});
  };
  mgitr.localScope.mgitrRequest("https://api.assembla.com/authorization?client_id="+mgitr.userSettings.getIdentifier()+"&response_type=pin_code","GET",pinCodeUse,false);

};

/**
 * Init
 * @type {mgitr.localScope.UserSettings}
 */


$(document).ready(function(){
    mgitr.init = function(){
      if (mgitr.userSettings.isIdentified()!==true){
          var assemblaForm = new mgitr.localScope.View("assembla_form.html", "#container", mgitr.localScope.AssemblaForm);
          assemblaForm.load();
      }else{
          new mgitr.localScope.SpaceList();
          $("#container").html('<div class="panel-group" id="accordion"></div>');
      }
    };
    mgitr.init();
    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            if (request.msg == "init")
                mgitr.init();
    });
});