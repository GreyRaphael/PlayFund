# Fund Introduction

## Get All Funds code

```py
# in JupyterLab test
import requests
import pandas as pd

funds_jsobj=requests.get('http://fund.eastmoney.com/js/fundcode_search.js').text[8:-1]
funds_list=eval(funds_jsobj)
funds_df=pd.DataFrame(funds_list)

funds_df.to_csv('all_funds.csv', index=False, header=False)
funds_df.loc[funds_df[0]=='001719']

df=pd.read_csv('all_funds.csv',dtype=str, header=None)
df.loc[df[0]=='001719']
```

## Get one fund details

通过F12/Network在[001956](http://fund.eastmoney.com/001956.html)获取基金接口: `http://fund.eastmoney.com/pingzhongdata/001956.js`
> 如本目录下001956.js文件所示的结构

较为有价值的数据:
1. 单位净值走势: 通过regex获取
2. 同类排名走势: 通过regex获取
3. 业绩评价: 通过regex获取

Notes:
> 累计净值=单位净值+分红

```py
# in JupyterLab test
import requests
import re

# All单位净值走势: 分别对应timestamp, 单位净值，涨跌幅
pat_equity=re.compile(r'(\d+),"y":(\d+.\d+),"equityReturn":(\d+|-?\d+.\d+),')
# All同类排名走势: 分别对应timestamp, 排名，同类基金数目
pat_rate=re.compile(r'(\d+),"y":(\d+),"sc":"(\d+)')
# 基金经理业绩评价 ['选股能力', '收益率', '抗风险', '稳定性','择时能力']
pat_performance=re.compile(r'(\d+\.\d+),(\d+\.\d+),(\d+\.\d+),(\d+\.\d+),(\d+\.\d+)\],"jzrq')

fund_code='001956'
res=requests.get(f'http://fund.eastmoney.com/pingzhongdata/{fund_code}.js')

equity=pat_equity.findall(res.text)
rate=pat_rate.findall(res.text)
performance=pat_performance.search(res.text).groups()

# test result
len(equity)
len(rate)
len(performance)
```

example: from timestamp to date

```py
import panda as pd

pd.Timestamp(1550764800000, unit='ms') # Timestamp('2019-02-21 16:00:00')
```