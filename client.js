"use strict";

const assert = require("assert");
const crypto = require("crypto");
const extend = require("extend");
const request = require("request-promise-native");
const xmlJs = require("xml-js");
const Js2Xml = require("js2xml").Js2Xml;

class SagepayAdminApiClient {
    constructor(options) {
        assert(options, "options must be provided");
        assert(options.user, "options.user must be provided");
        assert(options.password, "options.password must be provided");
        assert(options.vendor, "options.vendor must be provided");

        this.options = extend({
            endpoint: "https://test.sagepay.com/access/access.htm"
        }, options);
    }

    request(options) {
        options = extend({}, {
            vendor: this.options.vendor,
            user: this.options.user,
            password: this.options.password
        }, options);

        const xml = sign(options);
        return request({
            method: "POST",
            url: this.options.endpoint,
            form: {
                "XML": xml
            }
        }).then((xmldata) => {
            var element = xmlJs.xml2js(xmldata);
            var packed = pack(element);
            return packed.vspaccess[0];
        });
    }
}
module.exports = SagepayAdminApiClient;

function sign(option) {
    var options = {};
    options = extend({}, option, options);
    delete options.user;
    delete options.vendor;
    delete options.password;
    delete options.command;
    options = extend({}, {vendor: option.vendor}, options);
    options = extend({}, {user: option.user}, options);
    options = extend({}, {command: option.command}, options);
    options = extend({}, options, {password: option.password});
    
    function render_xml(js_object) {
        var converted_xml = new Js2Xml("vspaccess", js_object);
        var xml_str = converted_xml.toString();
        xml_str = remove_xmldef(remove_linebreak(xml_str));
        return xml_str;
    }

    var to_be_hashed = remove_root(render_xml(options));
    const md5 = crypto.createHash("md5").update(to_be_hashed).digest();
    delete options.password;
    options.signature = md5.toString("hex");

    return render_xml(options);
}

function remove_xmldef(str) {
    return str.replace(/<\?xml.+\?>|<!DOCTYPE.+]>/g, '');
}

function remove_root(str) {
    str = str.replace('<vspaccess>', '');
    str = str.replace('</vspaccess>', '');
    return str;
}

function remove_linebreak(str) {
    str = str.replace(/>\s*/g, '>');
    str = str.replace(/\s*</g, '<');
    str = str.replace(new RegExp( "\\n", "g" ), "");
    return str;
}

module.exports._sign = sign;

function pack(element) {
    var ret = {};
    element.elements.forEach(element => {
        if (!element.elements || element.elements.length === 0) {
            ret[element.name] = null;
        } else if (element.elements && element.elements.length === 1 && element.elements[0].type === "text") {
            ret[element.name] = element.elements[0].text;
        } else {
            ret[element.name] = ret[element.name] || [];
            ret[element.name].push(pack(element));
        }
    });
    return ret;
}

module.exports._pack = pack;