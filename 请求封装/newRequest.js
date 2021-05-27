class Request {
	constructor() {
		// 是否在执行login操作
		this.isLogin = 0 // 0 表示没有执行过登录 ， 1 表示正在执行登录
		// requestId 自增数字
		this.httpNum = 0
	}
	async request(opt = {}) {
		// todo!打点，统计开始请求接口日志 opt.url
		let netWorkStatus = await getNetworkType();
		!opt.data && (opt.data = {})
		let config = Object.assign({
			url: "",
			method: "GET",
			data: {},
			modules: "modules",
			baseUrl: "baseUrl",
			header: {
				"content-type": "application/json" // 默认值
			},
			needSaveLog: true,           // 是否需要保存日志,默认要保存，过滤没有必要保存的接口
			needDefaultToast: true,		 // 是否需要默认的toast提示，不需要的话在api里面配置
		}, opt);
		return new Promise((resolve, reject) => {
			// 网络异常直接抛出
			if(netWorkStatus != 1) {
				uni.showToast({
					title: "当前网络异常，请检查网络",
					icon: "none",
					duration: 2000
				})
				reject("当前网络异常，请检查网络");
				global._logger.writeLogs("当前网络异常，请检查网络");
				return;
			}
			let url = `${config.baseUrl}${config.modules}/${config.url}`; // 默认url
			if (config.method == "GET") {
				config.data.timeline = +new Date();
			} else if (config.method == "POST") {
				url = `${config.baseUrl}${config.url}`
			};
			config = Object.assign(config, opt);
			// 去掉空的字段
			removeVoidKey(config.data);
			this.httpNum++;
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
					if(config.needSaveLog) {
						
					}
				},
				fail: (error) => {
					this.isLoading = false;
					// 需要异常日志
					if(config.needSaveLog) {
						
					}
					uni.showToast({
						title: "手速太快，请再试一次",
						icon: "none",
						duration: 2000
					})
					reject(error)
				}
			})
		})		
	}
}

// 清除为空的参数
const removeVoidKey = obj => {
	Object.keys(obj).forEach(key => {
		if (obj[key] === "" || obj[key] === undefined || obj[key] === null) {
			delete obj[key]
		}
	})
}

let request = new Request();

export default request;
