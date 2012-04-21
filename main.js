/* 
 * TestingTesterTest
 * A testing framework for php programs running through php-fpm and node.js
 * Thanks to Andrew Johnston for writing node-fastcgi-parser fcgi.js its awesome :)
 */

var
mime = require('mime'),
fs = require('fs'),
util = require('util'),
php_fpmi = require("./phpfpm-interface.js"),
filename, directory;

filename = "test.php";
directory = __dirname;

php_fpmi.init(directory, filename);