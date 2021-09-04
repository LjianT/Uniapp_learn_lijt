// global.logManager--日志管理器
// getNetworkType--检查网络方法
// baseUrl--基础接口链接
import { getNetworkType } from "./wxApi"
import { baseUrl } from "./base.js"
class Request {
	constructor() {
		// 是否在执行login操作
		this.isLogin = 0 // 0 表示没有执行过登录 ， 1 表示正在执行登录
	}
	async request(opt = {}) {
		let _netWorkStatus = await getNetworkType();
		!opt.data && (opt.data = {})
		let config = Object.assign({
			url: "",
			method: "POST",
			data: {},
			baseUrl,
			header: {
				"content-type": "application/json" // 默认值
			},
			needSaveMoreLog: true,              // 是否需要记录更多日志--部分返回数据过多，成功返回只保存状态
            needDefaultToast: true,		        // 是否需要默认的toast提示，不需要的话在api里面配置
		}, opt);
		return new Promise((resolve, reject) => {
            // 统计开始的接口调用
            global.logManager.writeLogs("开始调用接口", !!opt && opt.url ? opt.url : "");
			// 网络异常直接抛出
			if(_netWorkStatus !== 1) {
				uni.showToast({
					title: "当前网络异常，请检查网络",
					icon: "none",
					duration: 2000
				})
				reject("当前网络异常，请检查网络");
				global._logger.writeLogs("当前网络异常，请检查网络");
				return;
			}
			let url = `${config.baseUrl}${config.url}`; // 默认url
			config = Object.assign(config, opt);
			uni.request({
				url,
				data: config.data,
				header: config.header,
				method: config.method,
				success: async (res) => {
					switch (res.data.code) {
						case 200:
							resolve(res.data.data)
							break;
						default:
							if(config.needDefaultToast && !!res.data.msg){
								uni.showToast({
									title: res.data.msg,
									icon: "none",
									duration: 2000
								})
							}
							reject(res.data)
							break;
					}
					// 需要保存日志的接口调用保存
					if(res.data.code === 200 && !config.needSaveMoreLog) {
						global.logManager.writeLogs(`调用接口 ${url} 成功`);
					} else {
                        global.logManager.writeLogs({
							apiName: config.url + "响应",
							options: config.data,
							result: res.data
						});
                    }
				},
				fail: (error) => {
					uni.showToast({
						title: "手速太快，请再试一次",
						icon: "none",
						duration: 2000
					})
					reject(error)
                    global.logManager.writeLogs({
						apiName: config.url + "异常响应",
						options: config.data,
						result: res.data
					});
				}
			})
		})		
	}
}
let request = new Request();
export default request;
