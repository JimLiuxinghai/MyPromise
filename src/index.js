function Promise(exector) {
    let self = this;
    this.value = undefined;
    this.reason = undefined;

    //加入pending状态标识
    this.status = 'pending';
    //存储成功函数的回调
    this.onResolvedCallbacks = [];
    
    //存储失败函数的回调
    this.onRejectedCallbacks = [];
    //成功
    function resolve (value) {
        //判断是否在pending状态
        if(self.status === 'pending') {
            self.value = value;
            self.status = 'resolved';
            //成功之后遍历then中成功的所有回调函数
            self.onResolvedCallbacks.forEach(fn => fn());
        }
        
    }
    //失败
    function reject (reason) {
        if(self.status === 'pending') {
            self.reason = reason;
            self.status = 'rejected';
            //失败后遍历then中失败的所有回调函数
            self.onRejectedCallbacks.forEach(fn => fn());
        }
    }
    //进行异常处理
    try {
        exector(resolve, reject)

    } catch (e) {
        reject(e)        
    }
}
//实现链式调用 then方法

//参数分别为成功和失败的回调
Promise.prototype.then = function (onFulfilled, onRejected) {
    //判断上次执行的结果
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : val => val;
    onRejected = typeof onRejected === 'function' ? onRejected : err => { throw err }
    //获取this
    let self = this;

    //因为then返回的是一个promise,所以在这里新建promise
    let promise2 = new Promise((resolve, reject) => {
        if (this.status === 'resolved') {
            //获取回调的返回值
            try {
                // 当执行成功回调的时候 可能会出现异常，那就用这个异常作为promise2的错误的结果
                let x = onFulfilled(self.value);
                //执行完当前成功回调后返回结果可能是promise
                resolvePromise(promise2, x, resolve, reject);
            } catch (e) {
                reject(e)
            }
        }
        if (this.status === 'rejected') {
            setTimeout(() => {
                try {
                    let x = onRejected(self.reason);
                    resolvePromise(promise2, x, resolve, reject);
                } catch (e) {
                    reject(e);
                }
            }, 0)
        }
        //异步状态
        if (this.status === 'pending') {
            //保存回调函数
            this.onResolvedCallbacks.push(() => {
                setTimeout(() => {
                    try {
                        let x = onFulfilled(self.value);
                        resolvePromise(promise2, x, resolve, reject);
                    } catch (e) {
                        reject(e);
                    }
                }, 0)
            })

            this.onRejectedCallbacks.push(() => {
                setTimeout(() => {
                    try {
                        let x = onRejected(self.reason);
                        resolvePromise(promise2, x, resolve, reject);
                    } catch (e) {
                        reject(e);
                    }
                }, 0)
            })
        }
    })
    //内部状态无法相互转换
    let called;
    //判断执行结果的类型
    function resolvePromise (promise2, x, resolve, reject) {
        //promise2 和 函数执行结果是同一个对象
        if(promise2 === x) {
            return reject(new TypeError('Chaining cycle'));
        }

        //x可能是个promise或者是一个普通值
        if( x !== null && typeof x === 'object' || typeof x === 'function') {
            try {
                let then = x.then;

                if(typeof then === 'function') {
                    then.call(x, y => { // 返回promise后的成功结果
                        // 递归直到解析成普通值为止
                        if (called) return; // 防止多次调用
                        called = true;
                        // 递归 可能成功后的结果是一个promise 那就要循环的去解析
                        resolvePromise(promise2, y, resolve, reject);
                    }, err => { // promise的失败结果
                        if (called) return;
                        called = true;
                        reject(err);
                    });
                }
            } catch (e) {
                reject(x)
            }
        } else {
            resolve(x);
        }
    }

    return promise2;
    
}
//实现catch
Promise.prototype.catch = function (onRejected) {
    return this.then(null, onRejected);
}


//实现all
// 传入一个promise数组
Promise.all = function (promises) {
    // 返回执行后的结果
    return new Promise((resolve, reject) => {
        let arr = [];
        let i = 0;
        function processData(index, data) {
            arr[index] = data;
            // 判断是否全部成功
            if (++i == promises.length) {
                resolve(arr);
            }
        }
        for (let i = 0; i < promises.length; i++) {
            promises[i].then(data => { // data是成功的结果
                //将每次执行成功后的结果传入函数
                processData(i, data);
            }, reject);
        }
    })
}
