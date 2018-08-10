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

F2Gpl.prototype.parse = function () {
    let actionsStr = this._action_list.map(({ name, params, accepts }) => {
        let paramsStr = '', acceptsStr = accepts ? `{${accepts}}` : '';
        if (params) {
            let paramsArr = [];
            for (let key in params) {
                if(!params.hasOwnProperty(key)){
                    continue
                }
                let value = params[key];
                if(typeof value === 'object'){
                    throw new Error('只支持基本类型参数')
                }
                if (typeof value === 'string') {
                    paramsArr.push(`${key}:"${value}"`)
                } else {
                    paramsArr.push(`${key}:${value}`)
                }
            }
            if(paramsArr.length>0){
                paramsStr = `(${paramsArr.join(',')})`
            }
        }
        return `${name}${paramsStr}${acceptsStr}`
    }).join('\n');
    return `${this._type}{\n${actionsStr}\n}`
};

module.exports = F2Gpl;
