var ui = require('../config/ui.json');
var config = require('../config/config.json');

var configApis = require('../config/apis.json');
var log = new Log();


/*
	Basic Application Info
*/
appInfo = function() {
    var appInfo = {
        headerTitle : ui.HEADING,
        title : ui.TITLE,
        copyright : ui.COPYRIGHT,
        server_url: ui.MDM_UI_URI
    };
    return appInfo;
};

/*
	Redirect to login page if the user is no loggedin
*/
if(session.get("mdmConsoleUserLogin") != "true" && request.getRequestURI() != appInfo().server_url + "login"){
	response.sendRedirect(appInfo().server_url + "login");
}


/*
	Deprcated!
	Common functions to call APIS in the backend. this is diconitinued after introdusing function calls
*/
getServiceURLs = function(item){
    var serverURL = config.HTTP_URL + ui.MDM_API_URI;
    var urls = configApis.APIS;
    arguments[0] = urls[item];
    var returnURL;
    if(session.get("mdmConsoleUser") != null) {
        var log = new Log();
        returnURL = serverURL + String.format.apply(this, arguments) + "?tenantId=" + session.get("mdmConsoleUser").tenantId;
        log.info("Calling URL From server: " + returnURL);
    } else {
        returnURL = serverURL + String.format.apply(this, arguments);
        log.info("Calling URL From server: " + returnURL);
    }
    return returnURL;
};


/*
	Deprcated!
	String Format function for above function
*/
String.format = function() {
    var s = arguments[0];
    for (var i = 0; i < arguments.length - 1; i++) {
        var reg = new RegExp("\\{" + i + "\\}", "gm");
        s = s.replace(reg, arguments[i + 1]);
    }

    return s;
};


index = function(){
	var user = session.get("mdmConsoleUser");
	if(user!=null){
		if(user.isAdmin){
			response.sendRedirect('console/dashboard');
		}else{
			response.sendRedirect(appInfo().server_url + 'users/devices?user=' + userFeed.username);
		}
	}

};


/*
	Top Navigation and Configurations navigations
*/

navigation = function(role) {

    switch(role) {
        case "admin":
            var topNavigation = [{
                name : "Home"
            }];
            break;
        case "manager":

            break;
        default:
    };
    var currentUser = session.get("mdmConsoleUser");
    var topNavigation = [];
    var configNavigation = [];
    if(currentUser){
        if(role == 'admin'){
            topNavigation = [
                {name : "Dashboard"	, link: appInfo().server_url + "console/dashboard", displayPage: "dashboard", icon: "icon-th-large"},
                {name : "Configurations", link: appInfo().server_url + "users/configuration", displayPage: "configuration", icon:"icon-wrench"},
                {name : "Management"	, link: appInfo().server_url + "devices/management", displayPage: "management", icon:"icon-briefcase"}               
            ];
            var configNavigation =	[
                {name : "Users", link: appInfo().server_url + "users/configuration", displayPage: "users", icon:"icon-user"},
                {name : "Roles", link: appInfo().server_url + "roles/configuration", displayPage: "roles", icon:"icon-group"},
                {name : "Policies", link: appInfo().server_url + "policies/configuration", displayPage: "policies", icon:"icon-lock"},
            ];
        }else if(role == 'mdmadmin'){
            topNavigation = [
                {name : "Dashboard"	, link: appInfo().server_url + "console/dashboard", displayPage: "dashboard", icon: "icon-th-large"},
                {name : "Configurations", link: appInfo().server_url + "users/configuration", displayPage: "configuration", icon:"icon-wrench"},
                {name : "Management"	, link: appInfo().server_url + "devices/management", displayPage: "management", icon:"icon-briefcase"},
            ];
            var configNavigation =	[
                {name : "Users", link: appInfo().server_url + "users/configuration", displayPage: "users", icon:"icon-user"},
                {name : "Roles", link: appInfo().server_url + "roles/configuration", displayPage: "roles", icon:"icon-group"},
                {name : "Policies", link: appInfo().server_url + "policies/configuration", displayPage: "policies", icon:"icon-lock"},
            ];
        }else{
            topNavigation = [
                {name : "My Devices"	, link: appInfo().server_url + "users/devices", displayPage: "management", icon:"icon-briefcase"}
            ];
        }
    }

    return {
        topNavigation : topNavigation,
        configNavigation: configNavigation
    };

};


/*
	Assign theme and default layout of the theme
*/

theme = function() {

    var theme = {
        name : ui.MDM_THEME,
        default_layout : "1-column"
    };

    return theme;

};


/*
	Whole context which is sent to each request
*/

context = function() {

    var contextData = {};
    var currentUser = session.get("mdmConsoleUser");  
    if(currentUser){
        if(currentUser.isAdmin){
            contextData.user = {
                name : "Admin",
                role : "admin"
            };
        }else if(currentUser.isMDMAdmin){
            contextData.user = {
                name : "MDM Admin",
                role : "mdmadmin"
            };
        }else{
            contextData.user = {
                name : "User",
                role : "user"
            };
        }
    }else{
        contextData.user = {
            name : "Guest",
            role : "guest"
        };
    }

    var appDefault = {
        layout : this.theme().default_layout,
        title : this.appInfo().title,
        appInfo : this.appInfo(),
        theme : this.theme(),
        userLogin : session.get("mdmConsoleUserLogin"),
        currentUser : session.get("mdmConsoleUser"),
        resourcePath: "../themes/" + this.theme().name + "/img/",
        contextData : contextData,
        navigation : this.navigation(contextData.user.role),
        deviceImageService: ui.DEVICES_IMAGE_SERVICE
    };

    return appDefault;
};