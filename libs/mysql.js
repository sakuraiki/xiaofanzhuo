var mysql = require('mysql');
var Promise = require('bluebird')
var config = require('../config.js')
 
var pool  = mysql.createPool({
  host     : config.database.HOST,
  user     : config.database.USERNAME,
  password : config.database.PASSWORD,
  database : config.database.DATABASE
});
 
var query = function( sql, values ) {
 console.log(sql)
 console.log(JSON.stringify(values))
  return new Promise(( resolve, reject ) => {
    pool.getConnection(function(err, connection) {
      if (err) {
        console.log("Connection Failed:" +err.code)
        reject( err )
      } else {
        connection.query(sql, values, ( err, rows) => {
 
          if ( err ) {
            console.log("Query Failed:" +err.code)
            reject( err )
          } else {
            resolve( rows )
          }
          connection.release()
        })
      }
    })
  })
 
}
 

var admins=
`create table if not exists admins(
 id INT NOT NULL AUTO_INCREMENT,
 name VARCHAR(100) NOT NULL,
 password VARCHAR(40) NOT NULL,
 PRIMARY KEY ( id )
);`

var xfzs=
`create table if not exists xfzs(
 id INT NOT NULL,
 name VARCHAR(400),
 address VARCHAR(800) NOT NULL,
 contactor VARCHAR(40) NOT NULL,
 tel VARCHAR(40) NOT NULL,
 longitude  DOUBLE NOT NULL,
 latitude  DOUBLE NOT NULL,
 volume SMALLINT,
 photolist  VARCHAR(400),
 PRIMARY KEY ( id )
) ENGINE=InnoDB DEFAULT CHARSET=utf8;`

var schools=
`create table if not exists schools(
 id INT NOT NULL AUTO_INCREMENT,
 name VARCHAR(400) NOT NULL,
 xfzid INT NOT NULL,
 xfzname VARCHAR(400) NOT NULL,
 PRIMARY KEY ( id )
) ENGINE=InnoDB DEFAULT CHARSET=utf8;`

var wxusers=
`create table if not exists wxusers(
 id VARCHAR(100) NOT NULL,
 longitude  DOUBLE NOT NULL,
 latitude  DOUBLE NOT NULL,
 keyword VARCHAR(100),
 time TIMESTAMP,
 PRIMARY KEY ( id )
) ENGINE=InnoDB DEFAULT CHARSET=utf8;`


// users=
// `create table if not exists users(
//  id INT NOT NULL AUTO_INCREMENT,
//  name VARCHAR(100) NOT NULL,
//  pass VARCHAR(40) NOT NULL,
//  PRIMARY KEY ( id )
// );`
 
// posts=
// `create table if not exists posts(
//  id INT NOT NULL AUTO_INCREMENT,
//  name VARCHAR(100) NOT NULL,
//  title VARCHAR(40) NOT NULL,
//  content  VARCHAR(40) NOT NULL,
//  uid  VARCHAR(40) NOT NULL,
//  moment  VARCHAR(40) NOT NULL,
//  comments  VARCHAR(40) NOT NULL DEFAULT '0',
//  pv  VARCHAR(40) NOT NULL DEFAULT '0',
//  PRIMARY KEY ( id )
// );`
 
// comment=
// `create table if not exists comment(
//  id INT NOT NULL AUTO_INCREMENT,
//  name VARCHAR(100) NOT NULL,
//  content VARCHAR(40) NOT NULL,
//  postid VARCHAR(40) NOT NULL,
//  PRIMARY KEY ( id )
// );`
 
var createTable = function( sql ) {
  return query( sql, [] )
}
 
// 建表
// createTable(users)
// createTable(posts)
// createTable(comment)
createTable(admins)
createTable(xfzs)
createTable(schools)
createTable(wxusers)
 
// 添加管理员
var insertAdmin = function( value ) {
  var _sql = "insert into admins(name,password) values(?,?);"
  return query( _sql, value )
}

// 修改管理员密码
var updateAdmin = function( id, name, password ) {
  var _sql = `
    UPDATE admins
    SET password="${password}",
      name="${name}"
      where id=${id}
      `
  return query( _sql)
}

// 删除管理员
var deleteAdminWithId = function( value ) {
  var _sql = "delete from admins where id=?;"
  return query( _sql, value )
}

// 查询所有管理员
var findAllAdmin = function (  ) {
  var _sql = `
    SELECT * FROM admins
      `
  return query( _sql)
}

// 通过名字查找管理员
var findAdminByName = function (  name ) {
  var _sql = `
    SELECT * from admins
      where name="${name}"
      `
  return query( _sql)
}

// 新增小饭桌
var insertXfz = function( value ) {
  var _sql = "insert into xfzs(id,name,address,contactor,tel,longitude,latitude,volume,photolist) values(?,?,?,?,?,?,?,?,?);"
  return query( _sql, value )
}
// 更新小饭桌照片
var updatePhotolist = function( value ) {
  var _sql = "update xfzs set photolist=? where id=?;"
  return query( _sql, value )
}

// 更新小饭桌信息
var updateXfz = function( value ) {
  var _sql = "update xfzs set name=?,address=?,contactor=?,tel=?,longitude=?,latitude=?,volume=?,photolist=? where id=?;"
  return query( _sql, value )
}

// 删除小饭桌
var deleteXfz = function( value ) {
  var _sql = "delete from xfzs where id=?;"
  return query( _sql, value )
}

// 通过小饭桌id查找
var findXfzById = function (  id ) {
  var _sql = `
    SELECT * from xfzs
      where id="${id}"
      `
  return query( _sql)
}

// 查询所有小饭桌
var findAllXfz = function (  ) {
  var _sql = `
    SELECT * FROM xfzs
      `
  return query( _sql)
}

// 通过关键词模糊查找对应小饭桌
var findSchoolByName = function ( school ) {
  var _sql = `
    SELECT distinct name FROM schools where name like "%${school}%"
      `
  return query( _sql)
}

// 通过关键词精确查找对应小饭桌
var findSchoolByFullName = function ( school ) {
  var _sql = `
    SELECT * FROM schools where name="${school}"
      `
  return query( _sql)
}

// 通过小饭桌id查找关键词项
var findSchoolByXfz = function ( xfzid ) {
  var _sql = `
    SELECT * FROM schools where xfzid="%${xfzid}%"
      `
  return query( _sql)
}

// 新增关键词
var insertSchool = function( value ) {
  var _sql = "insert into schools(name,xfzid,xfzname) values(?,?,?);"
  return query( _sql, value )
}

// // 新增关键词
// var insertOrUpdateSchool = function( value ) {
//   var _sql = `insert into schools(name,xfzid) values("${name}","${xfzid}") ON DUPLICATE KEY UPDATE name=values(name),xfzid=values(xfzid);`
//   return query( _sql, value )
// }

// 修改关键词信息
var updateSchool = function( id, name, xfzid, xfzname ) {
  var _sql = `
    UPDATE schools
    SET name="${name}",
        xfzid="${xfzid}",
        xfzname="${xfzname}"
      where id="${id}"
      `
  return query( _sql)
}

// 删除关键词
var deleteSchoolWithId = function( value ) {
  var _sql = "delete from schools where id=?;"
  return query( _sql, value )
}

// 删除关键词
var deleteSchoolWithName = function( value ) {
  var _sql = "delete from schools where name=?;"
  return query( _sql, value )
}

// 删除关键词
var deleteSchoolWithXfz = function( value ) {
  var _sql = "delete from schools where xfzid=?;"
  return query( _sql, value )
}


// 更新wx用戶信息
 // id INT NOT NULL,
 // longitude  VARCHAR(40) NOT NULL,
 // latitude  VARCHAR(40) NOT NULL,
 // keyword VARCHAR(100),
 // time TIMESTAMP,
var insertOrUpdateWxuser = function( id,longitude,latitude,keyword,time ) {
  var _sql = `insert into wxusers(id,longitude,latitude,keyword,time) values("${id}",${longitude},${latitude},"${keyword}",NOW()) ON DUPLICATE KEY UPDATE id=values(id),longitude=values(longitude),latitude=values(latitude),keyword=values(keyword),time=values(time);`
  // console.log(_sql)
  return query( _sql )
}

// 更新wx用戶信息
var findWxuser = function( value ) {
  var _sql = "select * from wxusers where id=?;"
  return query( _sql, value )
}
 
 
module.exports={
  query : query,
  createTable : createTable,
  insertXfz : insertXfz,
  updateXfz : updateXfz,
  deleteXfz : deleteXfz,
  updatePhotolist : updatePhotolist,
  insertSchool : insertSchool,
  updateSchool : updateSchool,
  findSchoolByFullName : findSchoolByFullName,
  deleteSchoolWithId : deleteSchoolWithId,
  insertAdmin : insertAdmin,
  updateAdmin : updateAdmin,
  deleteAdminWithId : deleteAdminWithId,
  findXfzById : findXfzById,
  findSchoolByName : findSchoolByName,
  findAllXfz : findAllXfz,
  findAllAdmin : findAllAdmin,
  findAdminByName : findAdminByName,
  insertOrUpdateWxuser : insertOrUpdateWxuser,
  findWxuser : findWxuser

}