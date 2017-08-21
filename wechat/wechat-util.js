'use strict'

var xml2js = require('xml2js')
var Promise = require('bluebird')

var tpl = require('./tpl')

exports.parseXMLAsync = function(xml){
    return new Promise(function(resolve, reject){
        xml2js.parseString(xml, {trim:true}, function(err, content){
            if(err) reject(err)
            else resolve(content)
        })
    })
}

// Usage: formatMessage(messageObj.xml)
// This function is to simpler the attributes of the xml2js objs, like:
// 		ToUserName: [ 'gh_9244920b5196' ] => ToUserName: 'gh_9244920b5196'
function formatMessage(source){
	var message = {}

	if(typeof source === 'object'){
		var keys = Object.keys(source)
		var keysLen = keys.length
		for(var i = 0; i < keysLen; ++i){
			var item = source[keys[i]]
			var key = keys[i]

			if(!item instanceof Array || item.length === 0){
				continue
			}

			if(item.length === 1){
				var val = item[0]
				if(typeof val === 'object'){
					message[key] = formatMessage(val)
				}else{
					message[key] = (val || '').trim()
				}
			}else{
				message[key] = []
				var itemLen = item.length
				for(var j = 0; j < itemLen; ++j){
					message[key].push(formatMessage(item[j]))
				}
			}
		}
	}
	return message
}

exports.formatMessage = formatMessage

exports.tpl = function(content, message){
	var info = {}

	var type = 'text'
	var fromUserName = message.ToUserName
	var toUserName = message.FromUserName

	if(Array.isArray(content)){
		type = 'news'
	}

	type = (content && content.type) || type
	info.content = content
	info.createTime = new Date().getTime()
	info.msgType = type
	info.toUserName = toUserName
	info.fromUserName = fromUserName
	return tpl.compiled(info)
}