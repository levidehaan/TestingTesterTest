/* 
 * TestingTesterTest
 * A testing framework for php programs running through php-fpm and node.js
 */

var 
mime = require('mime'),
fs = require('fs'),
util = require('util'),
net = require('net'),
fcgi = require("./fcgi/fcgi.js");

var params = [
["SCRIPT_FILENAME", "/home/th3m4d0n3/NetBeansProjects/TestingTesterTest/test.php"],
["QUERY_STRING", ""],
["REQUEST_METHOD", "GET"],
["CONTENT_TYPE", ""],
["CONTENT_LENGTH", ""],
["SCRIPT_NAME", "/test.php"],
["REQUEST_URI", "/test.php"],
["QUERY_STRING", ""],
["DOCUMENT_URI", "/test.php"],
["DOCUMENT_ROOT", "/home/th3m4d0n3/NetBeansProjects/TestingTesterTest"],
["PHP_SELF", "/test.php"],
["SERVER_PROTOCOL", "HTTP/1.1"],
["GATEWAY_INTERFACE", "CGI/1.1"],
["SERVER_SOFTWARE", "nginx/0.7.67"],
["REMOTE_ADDR", "10.11.12.8"],
["REMOTE_PORT", "4335"],
["SERVER_ADDR", "10.11.12.8"],
["SERVER_PORT", "82"],
["SERVER_NAME", "_"],
["REDIRECT_STATUS", "200"],
["HTTP_USER_AGENT", "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.0; Supplied by blueyonder; .NET CLR 1.1.4322; .NET CLR 2.0.50215)"],
["HTTP_ACCEPT_ENCODING", "none"],
["HTTP_CONNECTION", "Keep-Alive"],
["HTTP_ACCEPT", "*/*"],
["HTTP_HOST", "pr.icms.owner.net:82"]
];

var requests = 0;
var keepalive = true;
var responses = 0;
var recordId = 0;

function client() {
    var connection = new net.Stream();
    connection.setNoDelay(true);
    connection.setTimeout(0);
    var _recid = 0;
    var writer = null;
    var parser = null;
    var plen = fcgi.getParamLength(params);
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
            "contentLength": fcgi.getParamLength(params),
            "paddingLength": 0
        });
        
        writer.writeParams(params);
        
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
    /*
	function sendRequest() {
		header.type = FCGI_BEGIN;
		header.recordId = requests++;
		header.contentLength = 8;
		writer.writeHeader(header);
		writer.writeBegin(begin);
		connection.write(writer.tobuffer());
		header.type = FCGI_PARAMS;
		header.contentLength = plen;
		writer.writeHeader(header);
		writer.writeParams(params);
		connection.write(writer.tobuffer());
		header.contentLength = 0;
		writer.writeHeader(header);
		connection.write(writer.tobuffer());
		header.type = FCGI_STDIN;
		writer.writeHeader(header);
		connection.write(writer.tobuffer());
	}
*/		
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
                responses++;
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

        /*		
		parser.onBody = function(buffer, start, end) {
			body += buffer.toString("utf8", start, end);
			//process.stdout.write(buffer.slice(start, end));
		};
*/

        sendRequest(connection);
    });

    connection.addListener("timeout", function() {
        connection.end();
    });

    connection.addListener("end", function() {
        });

    connection.addListener("close", function() {
        setTimeout(function() {
            connection.connect(9000, "localhost") || null;
        }, 0);
    });

    connection.addListener("error", function(err) {
        console.log(JSON.stringify(err));
        connection.end();
    });

    connection.connect(9000, "localhost");
}

var clients = 1;
while(clients--) {
    client();
}

var then = new Date().getTime();	
var last = 0;
setInterval(function() {
    var now = new Date().getTime();
    var elapsed = now - then;
    var rps = responses - last;
    console.log("Requests: " + requests + ", Responses: " + responses + ", RPS: " + rps/(elapsed/1000));
    then = new Date().getTime();
    last = responses;
}, 1000);