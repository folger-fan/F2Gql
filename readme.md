介绍

F2Gql是function to Graphql的简称，就是将方法调用翻译成Graphql语言。

灵感来源于Java中的Web远程调用框架DWR。

利用DWR框架可以让AJAX开发变得很简单。DWR可以在客户端利用JavaScript直接调用服务端的Java方法并返回值给JavaScript就好像直接本地客户端调用一样(DWR根据Java类来动态生成JavaScrip代码)。它通过反射，将java翻译成javascript，然后利用回调机制，轻松实现了javascript调用Java代码。

DWR需要后端用Java实现，可不可以将这种功能扩展到其他语言？前端Js调后端接口就像调本地方法一样。

后端有各种语言，前后端调用也有各开发团队自己的习惯，有的是RESTfull风格，有的就是定义一个个接口名。有的团队没有写接口文档，后端返回哪些数据前端有时候要靠将查询数据打印出来验证。似乎很难统一。

很庆幸Facebook推出了Graphql，GraphQL 既是一种用于 API 的查询语言，GraphQL 对你的 API 中的数据提供了一套易于理解的完整描述，Graphql是一个标准，各种语言都可以实现支持它。

用Graphql定义的接口，前端调后台接口发送的是一段查询语句，因为有接口定义的Schema，我们可以清晰的知道有哪些接口名，接口有哪些参数，返回的字段有哪些。 那么我们是不是可以将方法调用翻译成Graphql语言，发送到后台。

ES6有新API————Proxy，利用Proxy我们可以在对象设置、获取属性/方法的时候加一层过滤代码，获取到属性名/方法名、set的值和自定义get的值，并加上自己的处理，如代码所示：

function F2Gpl(type) {
    if (type === 'query' || type === 'mutation') {//Graphql只有查询和变更两种特殊类型
        this._type = type;
    } else {
        throw new Error('type must be query or mutation')
    }
    this._action_list = [];
    let proxy;
    let callHandler = {
        get(target, name) {//设置方法代理，保存方法名、传参
            if (target[name]) {
                return target[name]
            }
            return function (params, accepts) {
                target._action_list.push({//调用保存
                    name, params, accepts
                });
                return proxy//链式调用
            }
        }
    };
    proxy = new Proxy(this, callHandler);
    return proxy;
}
我们对方法的get做代理，其中方法名对应Graphql接口名，参数名对应Graphql参数名，参数值对应Graphql参数值

最后可以将对象的方法操作，按照规则转换成Graphql语句。详情可见源码，很短。

使用

代码很简单，就五十多行代码。F2Graphql将方法调用翻译成Graphql字符串，前端如何调后台Graphql接口是业务自己的事。我们这边用express-graphql提供后端Graphql接口，用graphql-request发起对后端的调用。

查询

let queryParse = new F2Gql('query');
变更

let mutationParse = new F2Gql('mutation');
查询和变更，只是在生成对象时候传参不同，剩下的使用方法一致，以查询为例

基本返回类型

无参数

queryParse.queryWithNoArgAndSimpleResult().parse()
等同于

'{ queryWithNoArgAndSimpleResult }'
有参数

queryParse.queryWithArgAndSimpleResult({name: 'folger', age: 1}).parse()
等同于

`{ queryWithArgAndSimpleResult(name:"folger",age:1) }`
有参数

queryParse.queryWithArgAndSimpleResult({name: 'folger', age: 1}).parse()
等同于

`{ queryWithArgAndSimpleResult(name:"tom",age:1) }`
对象返回类型

前端定义要获取哪些字段，在第二个参数后面填写，同直接使用Graphql语句基本一致，只是不用填{}

无参数

queryParse.queryWithNoArgAndObjectResult(null, `name,age`).parse()
等同于

'{ queryWithNoArgAndObjectResult{name,age} }'
有参数

queryParse.queryWithArgAndObjectResult({
                        name: 'folger',
                        age: 1
                    }, `name,age`).parse()
等同于

`{ queryWithArgAndObjectResult(name:"folger",age:1){name,age} }`
有参数

queryParse.queryWithArgAndObjectResult({
                        name: 'tom',
                        age: 1
                    }, `name,age`).parse()
等同于

`{ queryWithArgAndObjectResult(name:"folger",age:1){name,age} }`
多接口查询/链式调用

queryParse.queryWithNoArgAndObjectResult(null, `name,age`).queryWithArgAndObjectResult({
                    name: 'tom',
                    age: 1
                }, `name,age`).parse()
等同于

`{
            queryWithNoArgAndObjectResult{name,age}
            queryWithArgAndObjectResult(name:"folger",age:1){name,age}
            }`