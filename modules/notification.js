var notification = (function () {
    var configs = {
        CONTEXT: "/"
    };
    var routes = new Array();
    var log = new Log();
    var db;
	var common = require("/modules/common.js");
    var deviceModule = require('device.js').device;
    var device;
    var module = function (dbs) {
        db = dbs;
        device = new deviceModule(db);
    };

    function mergeRecursive(obj1, obj2) {
        for (var p in obj2) {
            try {
                // Property in destination object set; update its value.
                if (obj2[p].constructor == Object) {
                    obj1[p] = MergeRecursive(obj1[p], obj2[p]);
                } else {
                    obj1[p] = obj2[p];
                }
            } catch (e) {
                // Property in destination object not set; create it and set its value.
                obj1[p] = obj2[p];
            }
        }
        return obj1;
    }

    // prototype
    module.prototype = {
        constructor: module,
        getNotifications: function(ctx){
            var result = db.query("SELECT * FROM notifications WHERE device_id = ? ORDER BY id DESC LIMIT 10", ctx.deviceid);
            var notifications = new Array();
            for (i=0;i<10;i++){

                if(result[i] == null) {
                    notifications[i] = {};
                    continue;
                }

                notifications[i] = result[i];
            }
            return notifications;
        },
        addIosNotification: function(ctx){
            log.info("IOS Notification >>>>>"+stringify(ctx));

            var identifier = ctx.msgID.replace("\"", "").replace("\"","")+"";
            var notifications = db.query("SELECT feature_code FROM notifications WHERE id = ?", identifier);

            var currentdate = new Date();
            var recivedDate =  currentdate.getDate() + "/"+ (currentdate.getMonth()+1)  + "/"+ currentdate.getFullYear() + " @ "+ currentdate.getHours() + ":"+ currentdate.getMinutes() + ":"+ currentdate.getSeconds();

            if(notifications != null) {
                var featureCode = notifications[0].feature_code;

                if(featureCode == "500P") {

                    var notificationId = identifier.split("-")[0];
                    var policySequence = identifier.split("-")[1];

                    var pendingFeatureCodeList = db.query("SELECT received_data, device_id FROM notifications WHERE id = ?", notificationId + "");
                    var received_data = pendingFeatureCodeList[0].received_data;
                    var device_id = pendingFeatureCodeList[0].device_id;
                    var targetOperationData = (parse(received_data))[parseInt(policySequence)];
                    var targetOperationId = targetOperationData.message.code;
                    var pendingExist = false;
                    var parsedReceivedData = (parse(received_data));

                    for(var i = 0; i < parsedReceivedData.length; i++) {
                        var receivedObject = parsedReceivedData[i];

                        if(receivedObject.message.code == targetOperationId) {
                            if(ctx.error == "Error") {
                                receivedObject.status = "error";
                            } else {
                                receivedObject.status = "received";
                            }
                        }

                        if(receivedObject.status == "pending") {
                            pendingExist = true;
                        }

                        parsedReceivedData[i] = receivedObject;
                    }

                    db.query("UPDATE notifications SET received_data= ? , received_date = ? WHERE id = ?", stringify(parsedReceivedData) + "", recivedDate + "", notificationId);

                    if(pendingExist) {

                        var message = stringify(ctx.data);
                        var devices = db.query("SELECT reg_id FROM devices WHERE id = ?", device_id + "");
                        var regId = devices[0].reg_id;
                        var regIdJsonObj = parse(regId);
                        var pushMagicToken = regIdJsonObj.magicToken;
                        var deviceToken = regIdJsonObj.token;

                        common.initAPNS(common.getPushCertPath(), common.getPushCertPassword(), deviceToken, pushMagicToken);
                    } else {
                        db.query("UPDATE notifications SET status='R' WHERE id = ?", notificationId);
                    }

                } else if(featureCode == "501P") {
                    log.info("DDDDDDDDDDDDDDDDDD :"+stringify(ctx.data));
                    var parsedReceivedData = parse(parse(stringify(ctx.data)));
                    var formattedData = new Array();

                    for(var i = 0; i < parsedReceivedData.length; i++) {
                        var receivedObject = parsedReceivedData[i];
                        var payloadIdentifier = receivedObject.PayloadIdentifier;

                        var featureName = common.getValueByFeatureIdentifier(payloadIdentifier);

                        if(featureName == null) {
                            continue;
                        }

                        var featureCodes = db.query("SELECT code FROM features WHERE name = ?", featureName);

                        if(featureCodes == null || featureCodes[0] == null || featureCodes[0].code == null) {
                            continue;
                        }

                        var innerResponse = {};
                        innerResponse.status = true;
                        innerResponse.code = featureCodes[0].code;
                        formattedData.push(innerResponse);
                    }

                    db.query("UPDATE notifications SET status='R', received_data= ? , received_date = ? WHERE id = ?", stringify(formattedData) +"", recivedDate+"", identifier);

                } else {
                    var policySeperator = identifier.indexOf("-");

                    if(policySeperator == -1) {
                        db.query("UPDATE notifications SET status='R', received_data= ? , received_date = ? WHERE id = ?", ctx.data+"", recivedDate+"", identifier);
                    }
                }
            }
        },
        addNotification: function(ctx){
			log.info("Android Notification >>>>>"+stringify(ctx));
            var currentdate = new Date();
            var recivedDate =  currentdate.getDate() + "/"+ (currentdate.getMonth()+1)  + "/"+ currentdate.getFullYear() + " @ "+ currentdate.getHours() + ":"+ currentdate.getMinutes() + ":"+ currentdate.getSeconds();

            db.query("UPDATE notifications SET status='R', received_data = ? , received_date = ? WHERE id = ?", ctx.data, recivedDate, ctx.msgID);
        },
        getLastRecord: function(ctx){
            log.info("Operation >>>>>>"+ctx.operation);
            var result = db.query("SELECT DISTINCT * FROM notifications WHERE received_data IS NOT NULL && device_id = ? && feature_code= ?", ctx.deviceid, ctx.operation);
            var features = db.query("SELECT * FROM features WHERE code= ?", ctx.operation);
            ctx.operation = String(features[0].name);
            ctx.data = "hi";
        //    device.sendToDevice(ctx);
            if(result == null || result == undefined ||result.length == 0) {
                return {};
            }

            return result[result.length-1];
        },
        getPolicyState: function(ctx){
            log.info("Test Function :aaaaaaaaaaaaaaaaaaaaa");
            var result = db.query("SELECT DISTINCT * FROM notifications WHERE received_data IS NOT NULL && device_id = ? && feature_code= ?", ctx.deviceid, '501P');
            // log.info("RRR"+stringify(result[0].received_data));
            var newArray = new Array();
            if(result == null || result == undefined ||result.length == 0) {
                return newArray;
            }
            var arrayFromDatabase = parse(result[result.length-1].received_data);
            for(var i = 0; i< arrayFromDatabase.length; i++){
               if(arrayFromDatabase[i].code == 'notrooted'){
                   var obj = {};
                   obj.name = 'Not Rooted';
                   obj.status = arrayFromDatabase[i].status;
                   newArray.push(obj);
               }else{
                   var featureCode = arrayFromDatabase[i].code;
                   try{
                       var obj = {};
                       var features = db.query("SELECT * FROM features WHERE code= '"+featureCode+"'");
                       obj.name = features[0].description;
                       obj.status = arrayFromDatabase[i].status;
                       newArray.push(obj);
                   }catch(e){
                       log.info("error");
                   }
               }
            }
			
            log.info("Final result >>>>>>>>>>"+stringify(newArray));
            return newArray;
        },
        getPolicyComplianceDevices:function(ctx){
            var compliance = ctx.compliance;

            var complianceDevices = new Array();
            var violatedDevices = new Array();
            var devices = db.query("SELECT * from devices");
            for(var i=0;i<devices.length;i++){
                var compliances =  this.getPolicyState({'deviceid':devices[i].id});
                var flag = true;
                for(var j=0;j<compliances.length;j++){
                    if(compliances[j].status == false){
                        flag = false;
                        break;
                    }
                }
                if(flag){
                    var obj = {};
                    obj.id =  devices[i].id;
                    obj.properties = devices[i].properties;
                    obj.username = devices[i].user_id;
                    complianceDevices.push(obj);
                }else{
                    var obj = {};
                    obj.id =  devices[i].id;
                    obj.properties = devices[i].properties;
                    obj.username = devices[i].user_id;
                    violatedDevices.push(obj);
                }

            }

            if(compliance){
                return complianceDevices;
            }else{
                return violatedDevices;
            }
        },
        getPolicyComplianceDevicesCount:function(ctx){
            var complianceDeviceCount = this.getPolicyComplianceDevices({'compliance':true}).length;
            var violatedDevicesCount = this.getPolicyComplianceDevices({'compliance':false}).length;
            var totalDevicesCount =  complianceDeviceCount+violatedDevicesCount;
            var complianceDeviceCountAsPercentage =  (complianceDeviceCount/(totalDevicesCount))*100;
            var violatedDevicesCountAsPercentage = (violatedDevicesCount/(totalDevicesCount))*100;
            var array = new Array();
            var obj1 = {};
            obj1.label = 'Compliance';
            obj1.data =  complianceDeviceCountAsPercentage;

            array.push(obj1);

            var obj2 = {};
            obj2.label = 'Non Compliance';
            obj2.data =  violatedDevicesCountAsPercentage;

            array.push(obj2);
            return array;
        }

    };
    // return module
    return module;
})();