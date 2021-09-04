/*
*   注意：formatTime--时间格式化方法
*   缓存单个key最大内存1M。根据使用和需要设置合理的maxSaveLength
*/ 
import { formatTime } from "./index.js"
class LogManager {
	constructor() {
		this.logData = [] 				// 日志
		this.logDataCache = [] 			// 缓冲区日志
		this.isSaveLogs = false 		// 是否在上传日志中
		this.maxSaveLength = 80 		// 最大保存数目（部分接口返回数据过多，导致单个缓存值超载，缩小每篇日志数量）
		this.maxTemporaryLength = 120 	// 最大临时保存数目
		this.saveTimer = null;			// 保存数据定时器
	}
	// 初始化，日志文件夹不存在=》创建
	init() {
		if (uni.getStorageSync("logData") == "undefined" || uni.getStorageSync("logData") === "") {
			uni.setStorageSync("logData", [])
		}
		if (uni.getStorageSync("logDataCache") == "undefined" || uni.getStorageSync("logDataCache") === "") {
			uni.setStorageSync("logDataCache", []);
		}
		this.logData = uni.getStorageSync("logData");
		this.logDataCache = uni.getStorageSync("logDataCache");
	}
	// 写入日志，写入成功上传到本地缓存
	writeLogs(log, logMoll) {
		if (!this.isSaveLogs) {
			this.writeLogsToSave("logData", log, logMoll);
			// 日志数目达到上限并且用户已经登录，自动上传日志
			if (this.logData.length > this.maxSaveLength || this.logDataCache.length > this.maxSaveLength) {
				this.saveLogs(this.logData);
			}
		} else {
			this.writeLogsToSave("logDataCache", log, logMoll);
		}
	}
	// 实际写入内容
	writeLogsToSave(dataName, log, logMoll) {
		// 日志格式整理
		let _logDataTmp = {
			time: formatTime(Date.now())
		};
		if(this[dataName].length >= this.maxTemporaryLength) {
			if(!this[dataName][this.maxTemporaryLength-1].isLast) {
				this[dataName] = this[dataName].slice(0, this.maxTemporaryLength - 1);
				let lastObj = typeof log === "string" ? log : JSON.stringify(log);
				_logDataTmp.result = "缓存保存失败，达到临时最大值" + lastObj;
				_logDataTmp.isLast = 1;
				this[dataName].push(_logDataTmp)
				this.saveInStorage(dataName)
			} else {
				return
			}
		// 没有达到临界值，继续保存 
		} else {
			if (typeof log === "string") {
				_logDataTmp.info = log;
				if(!!logMoll) {
					_logDataTmp.result = logMoll;
				}
				this[dataName].push(_logDataTmp);
			} else if (typeof log === "object") {
				this[dataName].push(log);
			}
			this.saveInStorage(dataName)
		}
	}
	// 保存写进缓存
	saveInStorage(dataName) {
		// 不影响逻辑，缓存超出的情况下自动清理缓存
		try {
		    uni.setStorageSync(dataName, this[dataName]);
		} catch (e) {
			// 处于日志区直接保存日志，否则清除缓存，以免逻辑进行不下去
			if(dataName === "logData") {
				this.saveLogs(this.logData);
			} else {
				uni.setStorageSync(dataName, []);
				this[dataName] = [];
				this.writeLogs("不影响逻辑强制清除" + (dataName === "logData" ? "" : "临时区") + "缓存")
			}
		}
	}
	// 保存日志，上传到服务器，并清空缓存
	async saveLogs(_tmpLogs) {
		this.isSaveLogs = true;
		// 保存日志操作
            // todo!
        //
		clearTimeout(this.saveTimer);
		this.saveTimer = setTimeout(() => {
			this.logData = this.logDataCache;
			this.isSaveLogs = false;
			uni.setStorageSync("logData", this.logDataCache)
			// 清空缓冲区
			this.logDataCache = [];
			uni.setStorageSync("logDataCache", []);
		}, 5000)
	}
}

export default LogManager;
