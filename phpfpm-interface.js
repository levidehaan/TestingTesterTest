
    
var 
net = require('net'),
fcgi = require("./fcgi/fcgi"),
params, 
requests = 0,
keepalive = true,
responses = 0,
recordId = 0,
fpmi = exports;


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
        ["HTTP_conn", "Keep-Alive"],
        ["HTTP_ACCEPT", "*/*"],
        ]);       
        
}
    

function fcgi_interface(opts, response) {
    if (typeof response !== "object"){
        response = false;
    }
    var
    _recid = 0,
    writer = null,
    parser = null,
    plen = fcgi.getParamLength(opts),
    FCGI_RESPONDER = fcgi.constants.role.FCGI_RESPONDER,
    FCGI_BEGIN = fcgi.constants.record.FCGI_BEGIN,
    FCGI_STDIN = fcgi.constants.record.FCGI_STDIN,
    FCGI_STDOUT = fcgi.constants.record.FCGI_STDOUT,
    FCGI_PARAMS = fcgi.constants.record.FCGI_PARAMS,
    FCGI_END = fcgi.constants.record.FCGI_END,
    conn = new net.Stream();
        
    conn.setNoDelay(true);
    conn.setTimeout(0);
        
    var header = {
        "version": fcgi.constants.version,
        "type": FCGI_BEGIN,
        "recordId": 0,
        "contentLength": 0,
        "paddingLength": 0
    };
    
    var begin = {
        "role": FCGI_RESPONDER,
        "flags": keepalive ? fcgi.constants.keepalive.ON : fcgi.constants.keepalive.OFF
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
        
        conn.write(writer.tobuffer());
        
        writer.writeHeader({
            "version": fcgi.constants.version,
            "type": fcgi.constants.record.FCGI_PARAMS,
            "recordId": requests,
            "contentLength": fcgi.getParamLength(opts),
            "paddingLength": 0
        });
        
        writer.writeParams(opts);
        
        conn.write(writer.tobuffer());
        
        writer.writeHeader({
            "version": fcgi.constants.version,
            "type": fcgi.constants.record.FCGI_PARAMS,
            "recordId": requests,
            "contentLength": 0,
            "paddingLength": 0
        });
        
        conn.write(writer.tobuffer());
        
        writer.writeHeader({
            "version": fcgi.constants.version,
            "type": fcgi.constants.record.FCGI_STDIN,
            "recordId": requests,
            "contentLength": 0,
            "paddingLength": 0
        });
        
        conn.write(writer.tobuffer());
    }
 	
    conn.ondata = function (buffer, start, end) {
        parser.execute(buffer, start, end);
    };

    conn.addListener("connect", function() {
        writer = new fcgi.writer();
        //writer.encoding = "binary";
        
        parser = new fcgi.parser();
        //parser.encoding = "binary";
        
        var body = "";

        parser.onRecord = function(record) {
            var parts, headers, responseStatus, header, headerParts;
            
            if(record.header.type == FCGI_STDOUT){
                body = record.body;
                    
                //put in code for response to send out the body to a server
                //right now just output the response from php to console log wrapped in body tags
                    
                console.log("<BODY>");
                console.log(body);
                console.log("</BODY>");
                    
            //split the body up into sections
            //parts = body.split("\r\n\r\n");

            } 
            //console.log(record);
            if(record.header.type == FCGI_END) {
                console.log("End Transaction");
                conn.end();
            }
            recordId = record.header.recordId;
        };

        parser.onHeader = function(header) {
        //do something when we get the header
        };

        parser.onError = function(err) {
            console.log(JSON.stringify(err, null, "\t"));
        };

        sendRequest(conn);
    });

    conn.addListener("timeout", function() {
        conn.end();
    });

    conn.addListener("end", function() {
        console.log("conn is ended");
    });

    conn.addListener("close", function() {
        console.log("conn is closed");
    });

    conn.addListener("error", function(err) {
        console.log(JSON.stringify(err));
        conn.end();
    });

    conn.connect(9000, "localhost");
}
    
 