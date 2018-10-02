function Promise(executor) {
    let self = this;
    self.value = undefined; // 成功的值
    self.reason = undefined; // 失败的值
    self.status = 'pending';// promise的初始状态pending
    // 将多个成功或失败回调用数组保存
    self.onResolvedCallbacks = [];
    self.onRejectedCallbacks = [];
    function resolve(value) { 
        if (self.status === 'pending') {
            self.value = value;
            self.status = 'resolved';
            // 保存成功的回调
            self.onResolvedCallbacks.forEach(fn => fn());
        }
    }
    function reject(reason) { 
        if (self.status === 'pending') {
            self.reason = reason;
            self.status = 'rejected';
            self.onRejectedCallbacks.forEach(fn => fn());
        }
    }
    try {
        //在new Promise时立即执行，称为执行器
        executor(resolve, reject);
    } catch (e) { 
        reject(e);
    }
}
//主要处理then中返回的值X和promise2的关系
function resolvePromise(promise2,x,resolve,reject){
    //当promise2和then返回的值X为同一个对象时，会陷入死循环
    if(promise2 === x){
        return reject(new TypeError('Chaining cycle'));
    }
    let called;
    // x可能是一个promise也可能是普通值
    if(x!==null && (typeof x=== 'object' || typeof x === 'function')){
        try{
            let then = x.then; 
            if(typeof then === 'function'){
                //call为了使x(promise)指向then
                then.call(x,y=>{ 
                    //用来限制即调用resolve也调用reject
                    if(called) return; 
                    called = true;
                    resolvePromise(promise2,y,resolve,reject);
                },err=>{ 
                    if(called) return;
                    called = true;
                    reject(err);
                });
            }else{
                //如果then不是函数的话，则是普通对象，直接resolve
                resolve(x);
            }
        }catch(e){
            if(called) return;
            called = true;
            reject(e);
        }
    }else{ 
        //x为普通值，直接resolve
        resolve(x);
    }
}
Promise.prototype.then = function (onFulfilled, onRejected) {
    onFulfilled = typeof onFulfilled === 'function'?onFulfilled:val=>val;
    onRejected = typeof onRejected === 'function'?onRejected: err=>{throw err}
    let self = this;
    let promise2;
    //promise不能单纯返回自身，需要每次返回一个新的promise来实现链式调用，因为
    //同一个promise的pending改为resolve或reject后便不可逆了
    promise2 = new Promise((resolve, reject) => {
        if (self.status === 'resolved') {
            //promiseA+规范要求用定时器
            setTimeout(()=>{
                try {
                    let x = onFulfilled(self.value);
                    //在then中，返回值可能是一个promise，所以需要在resolvePromise判断
                    resolvePromise(promise2,x,resolve,reject);
                } catch (e) {
                    reject(e);
                }
            },0)
        }
        if (self.status === 'rejected') {
            setTimeout(()=>{
                try {
                    let x = onRejected(self.reason);
                    resolvePromise(promise2,x,resolve,reject);
                } catch (e) {
                    reject(e);
                }
            },0)
        }
        if (self.status === 'pending') {
            self.onResolvedCallbacks.push(() => {
                setTimeout(()=>{
                    try {
                        let x = onFulfilled(self.value);
                        resolvePromise(promise2,x,resolve,reject);
                    } catch (e) {
                        reject(e);
                    }
                },0)
            });
            self.onRejectedCallbacks.push(() => {
                setTimeout(()=>{
                    try {
                        let x = onRejected(self.reason);
                        resolvePromise(promise2,x,resolve,reject);
                    } catch (e) {
                        reject(e);
                    }
                },0)
            });
        }
    });
    return promise2
}
Promise.defer = Promise.deferred = function(){
    let dfd = {};
    dfd.promise = new Promise((resolve,reject)=>{
        dfd.resolve = resolve;
        dfd.reject = reject;
    })
    return dfd;
}
Promise.reject = function(reason){
    return new Promise((resolve,reject)=>{
        reject(reason);
    })
}
Promise.resolve = function(value){
    return new Promise((resolve,reject)=>{
        resolve(value);
    })
}
Promise.prototype.catch = function(onRejected){
    return this.then(null,onRejected);
};
Promise.all = function(promises){
    return new Promise((resolve,reject)=>{
        let arr = [];
        let i = 0;
        function processData(index,data){
            arr[index] = data;
            // 我们能用arr.length === promises.length来判断请求是否全部完成吗？
            // 答案是不行的，假设arr[2] = 'hello swr'
            // 那么打印这个arr，将是[empty × 2, "hello swr"]，
            // 此时数组长度也是为3，而数组arr[0] arr[1]则为空
            // 那么换成以下的办法
            if(++i == promises.length){
                resolve(arr);
            }
        }
        for(let i = 0;i<promises.length;i++){
            //因为Promise.all最终返回的是一个数组成员按照顺序排序的数组
            // 而且异步执行，返回并不一定按照顺序，所以需要传当前的i
            promises[i].then(data=>{ 
                processData(i,data);
            },reject);
        }
    })
}
Promise.race = function(promises){
    return new Promise((resolve,reject)=>{
        for(let i = 0;i<promises.length;i++){
            promises[i].then(resolve,reject);
        }
    })
}
module.exports = Promise;