"use strict";

const assert = require("assert");
const crypto = require("crypto");
const extend = require("extend");
const axios = require('axios').default;
const qs = require('qs');
const { create } = require('xmlbuilder2');

class SagepayAdminApiClient {
    constructor(options) {
        assert(options, "options must be provided");
        assert(options.user, "options.user must be provided");
        assert(options.password, "options.password must be provided");
        assert(options.vendor, "options.vendor must be provided");

        this.options = extend({
            endpoint: "https://live.sagepay.com/access/access.htm"
        }, options);
    }

    async request(options) {
        options = extend({}, {
            vendor: this.options.vendor,
            user: this.options.user,
            password: this.options.password
        }, options);

        const xml = sign(options);
        const data = qs.stringify({ XML: xml });
        const request = await axios.post(this.options.endpoint, data, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        const xml_object = create(request.data);
        const result = xml_object.toObject().vspaccess;
        return result;
    }
}
module.exports = SagepayAdminApiClient;

function sign(option) {
    let options = {};
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
        const converted_xml = create({ vspaccess: js_object });
        let xml_str = converted_xml.toString({prettyPrint: false});
        xml_str = remove_xmldef(remove_linebreak(xml_str));
        return xml_str;
    }

    let to_be_hashed = remove_root(render_xml(options));
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