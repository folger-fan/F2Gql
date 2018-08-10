/**
 * Created by folgerfan on 2018/8/9.
 */
const F2Gql = require('../src/F2Gql');
const {graphql, buildSchema} = require('graphql');
const assert = require('assert');

let schema = buildSchema(`
  type User{
    name:String,
    age:Int
  }
  type Query {
    queryWithNoArgAndSimpleResult:String
    queryWithArgAndSimpleResult(name:String,age:Int):String
    
    queryWithNoArgAndObjectResult:User
    queryWithArgAndObjectResult(name:String,age:Int):User
  }
  
  type Mutation{
    addWithNoArgAndSimpleResult:String
    addWithArgAndSimpleResult(name:String,age:Int):String
    
    addWithNoArgAndObjectResult:User
    addWithArgAndObjectResult(name:String,age:Int):User
  }
`);

let root = {
    queryWithNoArgAndSimpleResult: () => 'Hello world!',
    queryWithArgAndSimpleResult: ({name, age}) => `lucky ${name} ${age}`,
    queryWithNoArgAndObjectResult: () => {
        return {
            name: 'folger',
            age: 1
        }
    },
    queryWithArgAndObjectResult: ({name, age}) => {
        return {
            name,
            age
        }
    },

    addWithNoArgAndSimpleResult: () => 'Hello world!',
    addWithArgAndSimpleResult: ({name, age}) => `lucky ${name} ${age}`,
    addWithNoArgAndObjectResult: () => {
        return {
            name: 'folger',
            age: 1
        }
    },
    addWithArgAndObjectResult: ({name, age}) => {
        return {
            name,
            age
        }
    }
};


describe('F2Gql test', function () {
    describe('使用', function () {
        it('创建对象的参数只能是query、mutation中的一种', function () {
            let queryParse = new F2Gql('query');
            assert.equal(typeof queryParse, 'object');
            let mutationParse = new F2Gql('query');
            assert.equal(typeof mutationParse, 'object');
            try {
                new F2Gql('other');
                assert.equal(1, 2);
            } catch (e) {
                assert.equal(e.message, 'type must be query or mutation')
            }
        });

        it('方法调用中参数值只能是基本类型', function () {
            let queryParse = new F2Gql('query');
            try {
                queryParse.getUser({user: {name: 'folger'}}).parse();
                assert.equal(1, 2);
            } catch (e) {
                assert.equal(e.message, 'only support basic type')
            }
        });

        it('调parse前不能使用原型链的方法', function () {
            Object.prototype.objFunc = function () {
            };
            let queryParse = new F2Gql('query');
            let err;
            try {
                queryParse.getUser({id: 1}).objFunc({name: 'folger'}).parse();
            } catch (e) {
                err = e;
            }
            assert.equal(!!err, true)
        })
    });

    describe('查询', function () {
        describe('基本返回类型', function () {
            it('无参数,查询结果相同', async function () {
                let queryParse = new F2Gql('query');
                let [r1, r2] = await Promise.all([graphql(schema, '{ queryWithNoArgAndSimpleResult }', root)
                    , graphql(schema, queryParse.queryWithNoArgAndSimpleResult().parse(), root)]);

                assert.equal(r1.data.queryWithNoArgAndSimpleResult, r2.data.queryWithNoArgAndSimpleResult);
            });
            it('有参数，参数相同结果相同', async function () {
                let queryParse = new F2Gql('query');
                let [r1, r2] = await Promise.all([graphql(schema, `{ queryWithArgAndSimpleResult(name:"folger",age:1) }`, root)
                    , graphql(schema, queryParse.queryWithArgAndSimpleResult({name: 'folger', age: 1}).parse(), root)]);
                assert.equal(r1.data.queryWithArgAndSimpleResult, r2.data.queryWithArgAndSimpleResult);
            });
            it('有参数，参数不同结果不同', async function () {
                let queryParse = new F2Gql('query');
                let [r1, r2] = await Promise.all([graphql(schema, `{ queryWithArgAndSimpleResult(name:"tom",age:1) }`, root)
                    , graphql(schema, queryParse.queryWithArgAndSimpleResult({name: 'folger', age: 1}).parse(), root)]);
                assert.notEqual(r1.data.queryWithArgAndSimpleResult, r2.data.queryWithArgAndSimpleResult);
            })
        });

        describe('对象返回类型', function () {
            it('无参数,查询结果相同', async function () {
                let queryParse = new F2Gql('query');
                let [r1, r2] = await Promise.all([graphql(schema, '{ queryWithNoArgAndObjectResult{name,age} }', root)
                    , graphql(schema, queryParse.queryWithNoArgAndObjectResult(null, `name,age`).parse(), root)]);

                assert.deepEqual(r1.data.queryWithNoArgAndObjectResult, r2.data.queryWithNoArgAndObjectResult);
            });
            it('有参数，参数相同结果相同', async function () {
                let queryParse = new F2Gql('query');
                let [r1, r2] = await Promise.all([graphql(schema, `{ queryWithArgAndObjectResult(name:"folger",age:1){name,age} }`, root)
                    , graphql(schema, queryParse.queryWithArgAndObjectResult({
                        name: 'folger',
                        age: 1
                    }, `name,age`).parse(), root)]);
                assert.deepEqual(r1.data.queryWithArgAndObjectResult, r2.data.queryWithArgAndObjectResult);
            });
            it('有参数，参数不同结果不同', async function () {
                let queryParse = new F2Gql('query');
                let [r1, r2] = await Promise.all([graphql(schema, `{ queryWithArgAndObjectResult(name:"folger",age:1){name,age} }`, root)
                    , graphql(schema, queryParse.queryWithArgAndObjectResult({
                        name: 'tom',
                        age: 1
                    }, `name,age`).parse(), root)]);
                assert.notDeepEqual(r1.data.queryWithArgAndObjectResult, r2.data.queryWithArgAndObjectResult);
            });
        });

        it('多接口查询', async function () {
            let queryParse = new F2Gql('query');
            let [r1, r2] = await Promise.all([graphql(schema, `{ 
            queryWithNoArgAndObjectResult{name,age}
            queryWithArgAndObjectResult(name:"folger",age:1){name,age} 
            }`, root)
                , graphql(schema, queryParse.queryWithNoArgAndObjectResult(null, `name,age`).queryWithArgAndObjectResult({
                    name: 'tom',
                    age: 1
                }, `name,age`).parse(), root)]);

            assert.notDeepEqual(r1.data, r2.data);
        })

    });


    describe('修改', function () {
        describe('基本返回类型', function () {
            it('无参数,查询结果相同', async function () {
                let mutationParse = new F2Gql('mutation');
                let [r1, r2] = await Promise.all([graphql(schema, 'mutation{ addWithNoArgAndSimpleResult }', root)
                    , graphql(schema, mutationParse.addWithNoArgAndSimpleResult().parse(), root)]);

                assert.equal(r1.data.addWithNoArgAndSimpleResult, r2.data.addWithNoArgAndSimpleResult);
            });
            it('有参数，参数相同结果相同', async function () {
                let mutationParse = new F2Gql('mutation');
                let [r1, r2] = await Promise.all([graphql(schema, `mutation{ addWithArgAndSimpleResult(name:"folger",age:1) }`, root)
                    , graphql(schema, mutationParse.addWithArgAndSimpleResult({
                        name: 'folger',
                        age: 1
                    }).parse(), root)]);

                assert.equal(r1.data.addWithArgAndSimpleResult, r2.data.addWithArgAndSimpleResult);
            });
            it('有参数，参数不同结果不同', async function () {
                let mutationParse = new F2Gql('mutation');
                let [r1, r2] = await Promise.all([graphql(schema, `mutation{ addWithArgAndSimpleResult(name:"tom",age:1) }`, root)
                    , graphql(schema, mutationParse.addWithArgAndSimpleResult({
                        name: 'folger',
                        age: 1
                    }).parse(), root)]);
                assert.notEqual(r1.data.addWithArgAndSimpleResult, r2.data.addWithArgAndSimpleResult);
            })
        });

        describe('对象返回类型', function () {
            it('无参数,查询结果相同', async function () {
                let mutationParse = new F2Gql('mutation');
                let [r1, r2] = await Promise.all([graphql(schema, 'mutation{ addWithNoArgAndObjectResult{name,age} }', root)
                    , graphql(schema, mutationParse.addWithNoArgAndObjectResult(null, `name,age`).parse(), root)]);

                assert.deepEqual(r1.data.addWithNoArgAndObjectResult, r2.data.addWithNoArgAndObjectResult);
            });
            it('有参数，参数相同结果相同', async function () {
                let mutationParse = new F2Gql('mutation');
                let [r1, r2] = await Promise.all([graphql(schema, `mutation{ addWithArgAndObjectResult(name:"folger",age:1){name,age} }`, root)
                    , graphql(schema, mutationParse.addWithArgAndObjectResult({
                        name: 'folger',
                        age: 1
                    }, `name,age`).parse(), root)]);

                assert.deepEqual(r1.data.addWithArgAndObjectResult, r2.data.addWithArgAndObjectResult);
            });
            it('有参数，参数不同结果不同', async function () {
                let mutationParse = new F2Gql('mutation');
                let [r1, r2] = await Promise.all([graphql(schema, `mutation{ addWithArgAndObjectResult(name:"folger",age:1){name,age} }`, root)
                    , graphql(schema, mutationParse.addWithArgAndObjectResult({
                        name: 'tom',
                        age: 1
                    }, `name,age`).parse(), root)]);
                assert.notDeepEqual(r1.data.addWithArgAndObjectResult, r2.data.addWithArgAndObjectResult);
            });
        });

        it('多接口变更', async function () {
            let queryParse = new F2Gql('mutation');
            let [r1, r2] = await Promise.all([graphql(schema, `{ 
            addWithNoArgAndObjectResult{name,age}
            addWithArgAndObjectResult(name:"folger",age:1){name,age} 
            }`, root)
                , graphql(schema, queryParse.addWithNoArgAndObjectResult(null, `name,age`).addWithArgAndObjectResult({
                    name: 'tom',
                    age: 1
                }, `name,age`).parse(), root)]);

            assert.notDeepEqual(r1.data, r2.data);
        })
    });

});