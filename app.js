'use strict'

var convert = require('koa-convert')
var Koa = require('koa')
var path = require('path')
// var ejs = require('ejs')
var heredoc = require('heredoc')
var crypto = require('crypto')
var mysql = require('./libs/mysql')
var session = require('koa-session-minimal');
var MysqlStore = require('koa-mysql-session');
var formidable = require("formidable");



var util = require('./libs/util')
var wechat = require('./wechat/g')
var config = require('./config')
var weixin = require('./wx/reply')
var Wechat = require('./wechat/wechat')


var wechat_file = path.join(__dirname, './config/wechat.txt')

var wechatApi = new Wechat(config.wechat)



var app = new Koa();
var serve = require('koa-static')
app.use(convert(serve(__dirname + "/resource")))
var xtplApp = require('xtpl/lib/koa')
//xtemplate模板渲染
xtplApp(app,{
    //配置模板目录redis
    views: './views'
})

// session存储配置
const sessionMysqlConfig= {
  user: config.database.USERNAME,
  password: config.database.PASSWORD,
  database: config.database.DATABASE,
  host: config.database.HOST,
}

let cookie = {
	maxAge: '', // cookie有效时长
  expires: '',  // cookie失效时间
  path: '', // 写cookie所在的路径
  domain: '', // 写cookie所在的域名
  httpOnly: '', // 是否只用于http请求中获取
  overwrite: '',  // 是否允许重写
  secure: '',
  sameSite: '',
  signed: ''
}

// 配置session中间件
app.use(session({
  key: 'USER_SID',
  store: new MysqlStore(sessionMysqlConfig),
  cookie: cookie
}))



var tpl = heredoc(function(){/*

*/})

var createNonce = function(){
	return Math.random().toString(36).substr(2, 15)
}

var createTimestamp = function(){
	return parseInt(new Date().getTime() / 1000, 10) + ''
}

var _sign = function(noncestr, ticket, timestamp, url){
	var params = [
		'noncestr=' + noncestr,
		'jsapi_ticket=' + ticket,
		'timestamp=' + timestamp,
		'url=' + url
	]

	var str = params.sort().join('&')
	var shasum = crypto.createHash('sha1')

	shasum.update(str)

	return shasum.digest('hex')
}

function sign(ticket, url){
	var noncestr = createNonce()
	var timestamp = createTimestamp()
	var signature = _sign(noncestr, ticket, timestamp, url)

	return {
		noncestr: noncestr,
		timestamp: timestamp,
		signature: signature,
		appid: config.wechat.appID
	}
}

// app.use(function *(next){
// 	if(this.url.indexOf('/xfz-detail') > -1){
// 		console.log('!!!!')
// 		var data = yield wechatApi.fetchAccessToken()
// 		var access_token = data.access_token
// 		var ticketData = yield wechatApi.fetchTicket(access_token)
// 		console.log(ticketData)
// 		var ticket = ticketData.ticket
// 		console.log(this.href)
// 		var url = this.href
// 		// url = url.replace(':8000','')	//同下
// 		url = url.replace('http','https')	//jssdk接口配置要不带协议名 这里用lt --port会导致微信计算的url协议为https而本地接收到的为http 服务器上运行请注释这行
// 		console.log(url)
// 		var params = sign(ticket, url)
// 		console.log(params)
// 		this.body = ejs.render(tpl, params)

// 		return next
// 	}

// 	yield next
// })

app.use(convert(function *(next){
	if(this.url.indexOf('favicon.ico') > -1){
		this.body = ''
		return
	}
	if(this.method === 'GET' && this.url.indexOf('/xfzlocal') > -1){
		console.log(JSON.stringify(this.cookie),JSON.stringify(this.session))
		// console.log(this.url.indexOf('/admin') > -1 && !!this.session.user)
		if(this.session.user){
			// console.log('session.user: '+this.session.user + JSON.stringify(this.session))
			if(this.url.indexOf('/school') > -1){
			    yield this.render('school',{
			    	host: this.href,
			    	session: this.session
			    })
			}else if(this.url.indexOf('/manager') > -1){
			    yield this.render('manager',{
			    	host: this.href,
			    	session: this.session
			    })
			}else if(this.url.indexOf('/xfz') > -1){
			    yield this.render('xfz',{
			    	host: this.href,
			    	session: this.session
			    })
			}
		}else{
			console.log('login session.user: '+this.session.user)
		    yield this.render('login',{
		    	host: this.href
		    })
		    console.log('login rendered')
		}
		return
	}else{
		yield next
	}
}))

function parsePostData( ctx ) {
  return new Promise((resolve, reject) => {
    try {
      let postdata = "";
      ctx.req.addListener('data', (data) => {
        postdata += data
      })
      ctx.req.addListener("end",function(){
        let parseData = parseQueryStr( postdata )
        resolve( parseData )
      })
    } catch ( err ) {
      reject(err)
    }
  })
}

// 将POST请求参数字符串解析成JSON
function parseQueryStr( queryStr ) {
    let queryData = {}
    if(queryStr.indexOf('&') === -1 && queryStr.indexOf('{') > -1 && queryStr.indexOf('}') > -1 && queryStr.indexOf(',') > -1){
    	queryData = JSON.parse(queryStr)
    }else{
	  let queryStrList = queryStr.split('&')
	  console.log( queryStrList )
	  for (  let [ index, queryStr ] of queryStrList.entries()  ) {
	    let itemList = queryStr.split('=')
	    queryData[ itemList[0] ] = decodeURIComponent(itemList[1])
	  }
    }
  return queryData
}


app.use(async (ctx,next) => {
	console.log(ctx)
	if(ctx.method === 'POST' && ctx.url.indexOf('/xfzlocal') > -1){
		// console.log(ctx.request.body)
		if(ctx.url.indexOf('/signin') > -1){
			// var form = ctx.request.body;
    		// let fields = await form.parse(ctx.req)
    		let fields = await parsePostData( ctx )
			console.log(fields)
			var name=fields.username;
			// var password=ctx.request.body.password;
			var password=fields.password;
			console.log(name)
			// await mysql.insertAdmin(['admin','admin']).then(console.log('inserted'))
			let result = await mysql.findAdminByName(name)
			console.log(result)
			var res=JSON.parse(JSON.stringify(result))
			if (name === res[0]['name'] && password === res[0]['password']) {
			    // ctx.flash.success='登录成功!';
			    console.log('Set session')
			    ctx.session.user=res[0]['name']
			    ctx.session.id=res[0]['id']
			    // this.session = ctx.session
			    console.log('ctx.session.id',ctx.session.id)
			    // ctx.redirect('back','http://localhost:4040/admin.html')
			    ctx.body='true'
			    console.log('session',ctx.session)
			    console.log('登录成功')
		    }else{
		    	console.log(res[0])
		    }
		}else if(ctx.url.indexOf('/getSchool') > -1){
			var fields = await parsePostData( ctx )
			// console.log(JSON.stringify(ctx))
			// console.log("**********"+JSON.stringify(fields))
			var limit = fields.limit?fields.limit:10
            var offset = fields.offset?fields.offset:0
            var search = fields.search

			var sql_head = 'SELECT COUNT(*) FROM schools'
			var sql_main = ''
			if(search){
				sql_main += ' where xfzid like "%'+ search +'%" or xfzname like "%'+ search +'%" or name like "%'+ search +'%"'
			}
			
			var total = await mysql.query(sql_head + sql_main)
			console.log(total)

			sql_head = 'SELECT * FROM schools'
			sql_main += ' limit '+ offset +','+ limit
			var result = await mysql.query(sql_head + sql_main)
			console.log(sql_head + sql_main)
			console.log(result)

			var res= {}
			res.total = JSON.parse(JSON.stringify(total))[0]['COUNT(*)']
			console.log(res.total)
			res.rows = JSON.parse(JSON.stringify(result))
			ctx.body = res
		}else if(ctx.url.indexOf('/deleteSchool') > -1){
			let fields = await parsePostData( ctx )
			console.log(fields)
			let id;

            let len = fields.length
            let totalDelSucc = 0
            let i = 0
            for(i = 0; i < len; ++i){
            	id = fields[i].id
            	let result = await mysql.deleteSchoolWithId(id)
            	if(result){
					++totalDelSucc
            	}
            }

			let res= {'result': totalDelSucc}
			ctx.body = res
		}else if(ctx.url.indexOf('/updateSchool') > -1){
			let fields = await parsePostData( ctx )
			console.log(fields)
			let id=fields.id
            let schoolname = fields.name
            let xfzid = fields.xfzid
            let xfzname = ''

            var relatedXfzInfo = await mysql.findXfzById(xfzid)
            if(relatedXfzInfo.length > 0){
		    	relatedXfzInfo = JSON.parse(JSON.stringify(relatedXfzInfo))[0]
		    	xfzname = relatedXfzInfo.name
            }

            if(id){
            	let result = await mysql.updateSchool(id,schoolname,xfzid,xfzname)
            }else{
            	let result = await mysql.insertSchool([schoolname,xfzid,xfzname])
            }

            console.log(JSON.stringify(result))
			let res= {'result': result}
			ctx.body = res
		}else if(ctx.url.indexOf('/getAdmin') > -1){
			var fields = await parsePostData( ctx )
			// console.log(JSON.stringify(ctx))
			// console.log("**********"+JSON.stringify(fields))
			var limit = fields.limit?fields.limit:10
            var offset = fields.offset?fields.offset:0
            var search = fields.search

			var sql_head = 'SELECT COUNT(*) FROM admins'
			var sql_main = ''
			if(search){
				sql_main += ' where name like "%'+ search +'%"'
			}
			
			var total = await mysql.query(sql_head + sql_main)
			console.log(total)

			sql_head = 'SELECT * FROM admins'
			sql_main += ' limit '+ offset +','+ limit
			var result = await mysql.query(sql_head + sql_main)
			console.log(sql_head + sql_main)
			console.log(result)

			var res= {}
			res.total = JSON.parse(JSON.stringify(total))[0]['COUNT(*)']
			console.log(res.total)
			res.rows = JSON.parse(JSON.stringify(result))
			ctx.body = res
		}else if(ctx.url.indexOf('/deleteAdmin') > -1){
			let fields = await parsePostData( ctx )
			console.log(fields)
			let id;

            let len = fields.length
            let totalDelSucc = 0
            let i = 0
            for(i = 0; i < len; ++i){
            	id = fields[i].id
            	let result = await mysql.deleteAdminWithId(id)
            	if(result){
					++totalDelSucc
            	}
            }

			let res= {'result': totalDelSucc}
			ctx.body = res
		}else if(ctx.url.indexOf('/updateAdmin') > -1){
			let fields = await parsePostData( ctx )
			console.log(fields)
			let id=fields.id
            let adminname = fields.name
            let password = fields.password

            if(id){
            	let result = await mysql.updateAdmin(id,adminname,password)
            }else{
            	let result = await mysql.insertAdmin([adminname,password])
            }

            console.log(JSON.stringify(result))
			let res= {'result': result}
			ctx.body = res
		}else if(ctx.url.indexOf('/getXfz') > -1){
			var fields = await parsePostData( ctx )
			// console.log(JSON.stringify(ctx))
			// console.log("**********"+JSON.stringify(fields))
			var limit = fields.limit?fields.limit:10
            var offset = fields.offset?fields.offset:0
            var search = fields.search

			var sql_head = 'SELECT COUNT(*) FROM xfzs'
			var sql_main = ''
			if(search){
				sql_main += ' where id like "%'+ search +'%" or name like "%'+ search +'%" or address like "%'+ search +'%" or contactor like "%'+ search +'%" or tel like "%'+ search +'%" or longitude like "%'+ search +'%" or latitude like "%'+ search +'%" or volume like "%'+ search +'%" or photolist like "%'+ search +'%"'
			}
			
			var total = await mysql.query(sql_head + sql_main)
			console.log(total)

			sql_head = 'SELECT * FROM xfzs'
			sql_main += ' limit '+ offset +','+ limit
			var result = await mysql.query(sql_head + sql_main)
			console.log(sql_head + sql_main)
			console.log(result)

			var res= {}
			res.total = JSON.parse(JSON.stringify(total))[0]['COUNT(*)']
			console.log(res.total)
			res.rows = JSON.parse(JSON.stringify(result))
			ctx.body = res
		}else if(ctx.url.indexOf('/deleteXfz') > -1){
			let fields = await parsePostData( ctx )
			console.log(fields)
			let id;

            let len = fields.length
            let totalDelSucc = 0
            let i = 0
            for(i = 0; i < len; ++i){
            	id = fields[i].id
            	let result = await mysql.deleteXfz(id)
            	if(result){
					++totalDelSucc
            	}
            }

			let res= {'result': totalDelSucc}
			ctx.body = res
		}else if(ctx.url.indexOf('/updateXfz') > -1 || ctx.url.indexOf('/insertXfz') > -1){
			let fields = await parsePostData( ctx )
			console.log(fields)
			let id=fields.id
            let xfzname = fields.name||"无"
            let address = fields.address||"无"
            let contactor = fields.contactor||"无"
            let tel = fields.tel||0
            let longitude = fields.longitude||0
            let latitude = fields.latitude||0
            let volume = fields.volume||0
            let photolist = fields.photolist||""

            if(ctx.url.indexOf('/updateXfz') > -1){
            	let result = await mysql.updateXfz([xfzname,address,contactor,tel,longitude,latitude,volume,photolist,id])
            }else{
            	let result = await mysql.insertXfz([id,xfzname,address,contactor,tel,longitude,latitude,volume,photolist])
            }

            console.log(JSON.stringify(result))
			let res= {'result': result}
			ctx.body = res
		}

	}else{
		await next()
	}
})





app.use(convert(function *(next){
	if(this.url.indexOf('/detail') > -1){
		var data = yield wechatApi.fetchAccessToken()
		var access_token = data.access_token
		var ticketData = yield wechatApi.fetchTicket(access_token)
		console.log(ticketData)
		var ticket = ticketData.ticket
		console.log(this.href)
		var url = this.href
		var hash = url.split('?')[1]
		var xfzid = hash.split('=')[1]
		// url = url.replace(':8000','')	//同下
		url = url.replace('http','https')	//jssdk接口配置要不带协议名 这里用lt --port会导致微信计算的url协议为https而本地接收到的为http 服务器上运行请注释这行
		console.log(url)
		var params = sign(ticket, url)
		console.log(params)

		var _result = yield mysql.findXfzById(xfzid)
		_result = JSON.parse(JSON.stringify(_result))[0]
		console.log(JSON.stringify(_result))

    	var photolist = _result.photolist?_result.split(','):['/photo/83025aafa40f4bfbe53d7a85004f78f0f6361875.jpg',
    			'/photo/psb.jpg',
    			'/photo/83025aafa40f4bfbe53d7a85004f78f0f6361875.jpg',
    			'/photo/83025aafa40f4bfbe53d7a85004f78f0f6361875.jpg']
    	yield this.render('detail',{
    		wxparam: params,
    		templateSkin: Math.random()>=0.5?'blue':'red',
    		titleAttribute: '超级好吃的',
    		vocalAmount: _result.volume||500,
    		contactor: {
    			name: _result.contactor||'佚名',
    			formatTel: _result.tel||'138-8888-8888',
    			tel: _result.tel||'13888888888',
    			address: _result.address||'很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长的地址'
    		},
    		photoList: photolist,
    		location: {
    			latitude: _result.latidue||0,
				longitude: _result.longitude||0
    		}
    	})
	}else{
		yield next
	}
}))

app.use(wechat(config.wechat, weixin.reply))

app.listen(4040)
console.log('Listening port 4040...')