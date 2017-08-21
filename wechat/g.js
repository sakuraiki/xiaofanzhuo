'use strict'

var Koa = require('koa')
var sha1 = require('sha1')
var getRawBody = require('raw-body')

var Wechat = require('./wechat')
var util = require('./wechat-util')



module.exports = function(opts, handler){
	console.log("In g")
	var wechat = new Wechat(opts)
	console.log("start")
	return function *(ctx, next){
		console.log(this.query)

		var ctx = this;
		var token = opts.token
		var signature = ctx.query.signature
		var nonce = ctx.query.nonce
		var timestamp = ctx.query.timestamp
		var echostr = ctx.query.echostr
		var str = [token,timestamp,nonce].sort().join('')
		var sha = sha1(str)

		console.log('A request comes in!' + this.req)
		if(ctx.method === 'GET'){
			if(sha === signature){
				ctx.body = echostr + ''
			}else{
				ctx.body = 'Authorization failed.'
			}
		}else if(ctx.method === 'POST'){
			if(sha !== signature){
				ctx.body = 'Authorization failed.'
				return false
			}

			var data = yield getRawBody(ctx.req,{
				length: ctx.length,
				limit: '1mb',
				encoding: ctx.charset
			})

			// console.log(data.toString())
			var content =yield util.parseXMLAsync(data)
			// console.log(content)

			var message = util.formatMessage(content.xml)
			console.log(message)
			ctx.weixin = message

			yield handler.call(ctx, next)

			wechat.reply.call(ctx)
		}
		
	}
}