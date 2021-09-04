class WorkerManager {
	constructor() {
		this.worker = null 									// 进程实例
		this.workerPart = "/static/workers/index.js";		// worker文件本地路径
	}
	// 初始化，日志文件夹不存在=》创建
	createWorker() {
		this.worker = wx.createWorker(this.workerPart, {
		    useExperimentalWorker: true
		})
		 // 监听worker被系统回收事件
		this.worker.onProcessKilled((err) => {
			console.log("监听worker被系统回收事件", err);
			// 重新创建一个worker
			this.init()
		})
		this.worker.onMessage(res => {
			this.watchMess(res)
		})
	}
	// 结束当前 Worker 线程
	closeWorker(err) {
		console.log("结束当前 Worker 线程");
		if(this.worker) {
			this.worker.terminate()
		}
	}
	// 监听线程返回数据
	watchMess(res) {
		switch (res.functionName){
			default:
				break;
		}
	}
}
const WORKERMANAGER = new WorkerManager();
export default WORKERMANAGER;
