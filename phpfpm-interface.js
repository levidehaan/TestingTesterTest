exports.php_fpmi = (function(){
    
    var 
    net = require('net'),
    fcgi = require("./fcgi/fcgi"),
    params, 
    requests = 0,
    keepalive = true,
    responses = 0,
    recordId = 0,
    fpmi = {};


    fpmi.init = function(directory, filename){
     
     return fcgi_interface([
        ["SCRIPT_FILENAME", directory + "/" + filename],
        ["QUERY_STRING", ""],
        ["REQUEST_METHOD", "GET"],
        ["SCRIPT_NAME", filename],
        ["REQUEST_URI", filename],
        ["PHP_SELF", filename],
        ["DOCUMENT_ROOT", directory],
        ["GATEWAY_INTERFACE", "CGI/1.1"],
        ["SERVER_SOFTWARE", "testingtestertest/0.0.1"],
        ["HTTP_CONNECTION", "Keep-Alive"],
        ["HTTP_ACCEPT", "*/*"],
        ]);       
        
    }
    

    function fcgi_interface(opts) {
        
        var connection = new net.Stream();
        connection.setNoDelay(true);
        connection.setTimeout(0);
        var _recid = 0;
        var writer = null;
        var parser = null;
        var plen = fcgi.getParamLength(opts);
        var FCGI_RESPONDER = fcgi.constants.role.FCGI_RESPONDER;
        var FCGI_BEGIN = fcgi.constants.record.FCGI_BEGIN;
        var FCGI_STDIN = fcgi.constants.record.FCGI_STDIN;
        var FCGI_STDOUT = fcgi.constants.record.FCGI_STDOUT;
        var FCGI_PARAMS = fcgi.constants.record.FCGI_PARAMS;
        var FCGI_END = fcgi.constants.record.FCGI_END;
    
        var header = {
            "version": fcgi.constants.version,
            "type": FCGI_BEGIN,
            "recordId": 0,
            "contentLength": 0,
            "paddingLength": 0
        };
    
        var begin = {
            "role": FCGI_RESPONDER,
            "flags": keepalive?fcgi.constants.keepalive.ON:fcgi.constants.keepalive.OFF
        };

        function sendRequest() {
            requests++;
        
            writer.writeHeader({
                "version": fcgi.constants.version,
                "type": fcgi.constants.record.FCGI_BEGIN,
                "recordId": requests,
                "contentLength": 8,
                "paddingLength": 0
            });
        
            writer.writeBegin({
                "role": fcgi.constants.role.FCGI_RESPONDER,
                "flags": keepalive?fcgi.constants.keepalive.ON:fcgi.constants.keepalive.OFF
            });
        
            connection.write(writer.tobuffer());
        
            writer.writeHeader({
                "version": fcgi.constants.version,
                "type": fcgi.constants.record.FCGI_PARAMS,
                "recordId": requests,
                "contentLength": fcgi.getParamLength(opts),
                "paddingLength": 0
            });
        
            writer.writeParams(opts);
        
            connection.write(writer.tobuffer());
        
            writer.writeHeader({
                "version": fcgi.constants.version,
                "type": fcgi.constants.record.FCGI_PARAMS,
                "recordId": requests,
                "contentLength": 0,
                "paddingLength": 0
            });
        
            connection.write(writer.tobuffer());
        
            writer.writeHeader({
                "version": fcgi.constants.version,
                "type": fcgi.constants.record.FCGI_STDIN,
                "recordId": requests,
                "contentLength": 0,
                "paddingLength": 0
            });
        
            connection.write(writer.tobuffer());
        }
 	
        connection.ondata = function (buffer, start, end) {
            parser.execute(buffer, start, end);
        };

        connection.addListener("connect", function() {
            writer = new fcgi.writer();
            //writer.encoding = "binary";
        
            parser = new fcgi.parser();
            //parser.encoding = "binary";
        
            var body = "";

            parser.onRecord = function(record) {
                var parts, headers, responseStatus, header, headerParts;
            
                if(record.header.type == FCGI_STDOUT){
                    body = record.body;
                    console.log("<BODY>");
                    console.log(body);
                    console.log("</BODY>");
                    parts = body.split("\r\n\r\n");

                    headers = parts[0];
                    headerParts = headers.split("\r\n");

                    body = parts[1];

                    responseStatus = 200;

                    headers = [];
                    try {
                        for(i in headerParts) {
                            header = headerParts[i].split(': ');
                            if (header[0].indexOf('Status') >= 0) {
                                responseStatus = header[1].substr(0, 3);
                                continue;
                            }

                            headers.push([header[0], header[1]]);
                        }
                    } catch (err) {
                    //console.log(err);
                    }
                
                } 
                //console.log(record);
                if(record.header.type == FCGI_END) {
                    console.log("End Transaction");
                }
                recordId = record.header.recordId;
            };

            parser.onHeader = function(header) {
                body = "";
                if(keepalive) {
                    if(header.recordId != _recid) {
                        _recid = header.recordId;
                        sendRequest(connection);
                    }
                }
            };

            parser.onError = function(err) {
                console.log(JSON.stringify(err, null, "\t"));
            };

            sendRequest(connection);
        });

        connection.addListener("timeout", function() {
            connection.end();
        });

        connection.addListener("end", function() {
            });

        connection.addListener("close", function() {
        
            });

        connection.addListener("error", function(err) {
            console.log(JSON.stringify(err));
            connection.end();
        });

        connection.connect(9000, "localhost");
    }
    
    
    return fpmi;
});