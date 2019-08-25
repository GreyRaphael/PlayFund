/** * 测试数据 * @type {arry} */
/*2019-08-25 17:16:16*/ var ishb = false;
/*基金或股票信息*/ 
var fS_name = "国联安科技动力";
var fS_code = "001956";
/*原费率*/ var fund_sourceRate = "1.50";
/*现费率*/ var fund_Rate = "0.15";
/*最小申购金额*/ var fund_minsg = "100";
/*基金持仓股票代码top10*/ var stockCodes = [];
/*基金持仓债券代码*/ var zqCodes = "";
/*收益率*/ 
/*近一年收益率*/ var syl_1n = "25.1897";
/*近6月收益率*/ var syl_6y = "25.2652";
/*近三月收益率*/ var syl_3y = "28.949";
/*近一月收益率*/ var syl_1y = "12.7849";
/*20交易日股票仓位测算图*/ var Data_fundSharesPositions = [];
/*All单位净值走势 equityReturn-净值回报 unitMoney-每份派送金*/ var Data_netWorthTrend = [
  { x: 1453737600000, y: 1.0, equityReturn: 0, unitMoney: "" },
  { x: 1453996800000, y: 1.0, equityReturn: 0, unitMoney: "" },
  // ...
  { x: 1566316800000, y: 1.0525, equityReturn: 2.3733, unitMoney: "" },
  { x: 1566403200000, y: 1.0416, equityReturn: -1.0356, unitMoney: "" },
  { x: 1566489600000, y: 1.0392, equityReturn: -0.2304, unitMoney: "" }
];
/*All累计净值走势(单位净值+分红)*/ var Data_ACWorthTrend = [
  [1453737600000, 1.0],
  [1453996800000, 1.0],
  // ...
  [1566316800000, 1.0525],
  [1566403200000, 1.0416],
  [1566489600000, 1.0392]
];
/*6个月，累计收益率走势*/ var Data_grandTotal = [
  // 本基金，同类平均，沪深300
];
/*All同类排名走势*/ var Data_rateInSimilarType = [
  { x: 1461600000000, y: 581, sc: "600" },
  { x: 1461686400000, y: 583, sc: "600" },
  // ...
  { x: 1566316800000, y: 5, sc: "1187" },
  { x: 1566403200000, y: 5, sc: "1188" },
  { x: 1566489600000, y: 5, sc: "1191" }
];
/*All同类排名百分比*/ var Data_rateInSimilarPersent = [
  // 可以通过同类排名走势计算得到
  [1461600000000, 3.17],
  [1461686400000, 2.83],
  // ...
  [1566316800000, 99.58],
  [1566403200000, 99.58],
  [1566489600000, 99.58]
];
/*规模变动 mom-较上期环比*/ var Data_fluctuationScale = {};
/*持有人结构*/ var Data_holderStructure = {};
/*资产配置*/ var Data_assetAllocation = {};
/*业绩评价 ['选股能力', '收益率', '抗风险', '稳定性','择时能力']*/ var Data_performanceEvaluation = {
  avr: "45.00",
  categories: ["选证能力", "收益率", "抗风险", "稳定性", "择时能力"],
  dsc: [
    "反映基金挑选证券而实现风险\u003cbr\u003e调整后获得超额收益的能力",
    "根据阶段收益评分，反映基金的盈利能力",
    "反映基金投资收益的回撤情况",
    "反映基金投资收益的波动性",
    "反映基金根据对市场走势的判断，\u003cbr\u003e通过调整仓位及配置而跑赢基金业\u003cbr\u003e绩基准的能力"
  ],
  data: [30.0, 60.0, 30.0, 10.0, 70.0]
};
/*现任基金经理*/ var Data_currentFundManager = [];
/*申购赎回*/ var Data_buySedemption = {};
/*同类型基金涨幅榜（页面底部通栏）*/ var swithSameType = [];
