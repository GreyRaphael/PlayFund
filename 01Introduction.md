# Fund Introduction

- [Fund Introduction](#fund-introduction)
  - [Fund knowledge](#fund-knowledge)
  - [TianTian Fund](#tiantian-fund)
  - [Tonghuashun Funds](#tonghuashun-funds)

## Fund knowledge

**Fund buy & sell time and fee**

| 买入提交 | (确认份额)盈亏查看 | 卖出提交 | (确认份额)到账 | 确认份额前一自然日 | 总耗时 |
|------|------------|------|----------|-----------|-----|
| 1    | 2          | 1    | 2        | 1         | 7   |
| 2    | 3          | 2    | 3        | 2         | 7   |
| 3    | 4          | 3    | 4        | 3         | 7   |
| 4    | 5          | 4    | 5        | 4         | 7   |
| 5    | 1          | 5    | 1        | 7         | 9   |

## TianTian Fund

example: get all funds info(fund_code, fund_name, fund_type)
> 大量的无效的基金，难以处理

```py
# in JupyterLab test
import requests
import pandas as pd

funds_jsobj=requests.get('http://fund.eastmoney.com/js/fundcode_search.js').text[8:-1]
funds_list=eval(funds_jsobj)
funds_df=pd.DataFrame(funds_list)

funds_df.to_csv('all_funds.csv', index=False, header=False)
# then import the csv to MySQL
funds_df.loc[funds_df[0]=='001719']

df=pd.read_csv('all_funds.csv',dtype=str, header=None)
df.loc[df[0]=='001719']
```

example: filter funds that cannot be bought

```py
# in JupyterLab test
import mysql.connector
import requests

# Connect to server
cnx = mysql.connector.connect(host="127.0.0.1", port=3306, db='Fund', user="root",password="xxxxxxxxxxx")
cur = cnx.cursor()

def get_codes():
    # read from db
    cur.execute('SELECT fund_code FROM FundInfo')
    funds = cur.fetchall()
    return list(*zip(*funds))

close_funds=[]

fund_codes=get_codes()
for code in fund_codes:
    r=requests.get(f'http://fundf10.eastmoney.com/jjfl_{code}.html')
    try:
        status = r.text.find('btn-red')
        if status == -1:
            close_funds.append(code)
    except Exception as e:
        print(code, e)

with open('closed_funds.txt', 'w') as file:
    for line in close_funds:
        file.write(line)
        file.write('\n')
# then import the .txt to MySQL
```

example: get one fund details

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

example: get recent equity

原则上来讲，可以通过[上一节](#get-one-fund-details)计算得到

通过F12/Network分析[阶段涨幅](http://fundf10.eastmoney.com/jdzf_001956.html)得到接口: `http://fundf10.eastmoney.com/FundArchivesDatas.aspx?type=jdzf&code=001956`

或者分析[163基金](http://quotes.money.163.com/fund/001956.html)通过HTML获取数据

```py
# test in JupyterLab
import requests
import re

r=requests.get('http://fundf10.eastmoney.com/FundArchivesDatas.aspx?type=jdzf&code=001956')
pat=re.compile(r'>(---|-?\d+\.\d+%)</li><li')

data=pat.findall(r.text)
len(data)
```

example: **buy or sell fund suggestion**

```py
import requests
import smtplib
from email.mime.text import MIMEText
import schedule
import time


def get_codes():
    # read file
    with open('fund_list.txt') as file:
        return file.read().split('\n')


def generate_report(funds_code):
    # scrab data
    report_buy = []
    report_sell = []
    for fund in funds_code:
        r = requests.get(f'http://fundgz.1234567.com.cn/js/{fund}.js')
        prediction = eval(r.text[8:-2])
        if eval(prediction['gszzl']) < 0:
            report_buy.append(
                f"{prediction['fundcode']}, {prediction['name']}, {prediction['gszzl']}")
        else:
            report_sell.append(
                f"{prediction['fundcode']}, {prediction['name']}, {prediction['gszzl']}")

    # generate report
    return '大盘预测跌(建议买入):\n'+'%\n'.join(report_buy) + \
        '%\n\n大盘预测涨(建议抛售):\n'+'%\n'.join(report_sell)+'%'


def send_mail(report):
    sender = 'gewei@pku.edu.cn'
    receivers = ['gewei@pku.edu.cn', ]

    msg = MIMEText(report)
    msg['From'] = f'Wei Ge<{sender}>'  # Wei Ge表示显示的名字
    msg['To'] = ';'.join(receivers)
    msg['Subject'] = f"Fund Report: {time.strftime('%Y-%m-%d %H:%M:%S')}"

    try:
        mail_server = smtplib.SMTP()
        mail_server.connect('mail.pku.edu.cn', 25)

        user_name = sender
        user_pwd = 'xxxxxx'
        mail_server.login(user_name, user_pwd)

        mail_server.sendmail(sender, receivers, msg.as_bytes())
    except Exception as e:
        print('send mail failed:', e)
    else:
        print(f"send mail success! at{time.strftime('%Y-%m-%d %H:%M:%S')}")


def task():
    funds_code = get_codes()
    report = generate_report(funds_code)
    send_mail(report)


schedule.every().monday.at("14:50").do(task)
schedule.every().tuesday.at("14:50").do(task)
schedule.every().wednesday.at("14:50").do(task)
schedule.every().thursday.at("14:50").do(task)
schedule.every().friday.at("14:50").do(task)

while True:
    schedule.run_pending()
    time.sleep(1)
```

## Tonghuashun Funds

example: get all funds info that can be bought from [同花顺](http://fund.10jqka.com.cn/datacenter/sy/)

```py
import requests
import pandas as pd

r_all=requests.get('http://fund.ijijin.cn/data/Net/info/all_F009_desc_0_0_1_9999_0_0_0_jsonp_g.html')
r_qdii=requests.get('http://fund.ijijin.cn/data/Net/info/QDII_F009_desc_0_0_1_9999_0_0_0_jsonp_g.html')
r_zsx=requests.get('http://fund.ijijin.cn/data/Net/info/zsx_F009_desc_0_0_1_9999_0_0_0_jsonp_g.html')

info_list=[r_all.text, r_qdii.text, r_zsx.text]

null=None # for below eval() error
summary=[]
for info in info_list:
    temp=eval(info[2:-1])['data']['data']
    print(len(temp))
    summary.append(temp)

# summary[0]['f501009']
df_all=pd.DataFrame(summary[0]).T # 7767
df_all_buy=df_all.loc[df_all['buy']=='1'] # 4621
# df_all_buy.to_csv('ths_buy.csv')

df_qdii=pd.DataFrame(summary[1]).T # 264
df_qdii_buy=df_qdii.loc[df_qdii['buy']=='1'] # 160
# df_qdii_buy.to_csv('qdii_buy.csv')

df_zsx=pd.DataFrame(summary[2]).T # 1088
df_zsx_buy=df_zsx.loc[df_zsx['buy']=='1'] # 665
# df_zsx_buy.to_csv('zsx_buy.csv')

# df_all_buy.loc[df_all_buy['type']=='QDII'].shape # (31, 32)
# df_qdii_buy.shape # (160, 32)
# 这里产生矛盾
# e.g. 如下结果不一致
# df_qdii_buy.loc[df_qdii_buy['code']=='162411']
# df_all_buy.loc[df_all_buy['code']=='162411']
# 先导出为csv, 然后利用navicat导入MySQL，然后利用sql语法将QDII和指数型给all进行修改
```

```sql
DELETE FROM FundInfo
WHERE FundInfo.type='bbx'

SELECT COUNT(*) FROM FundInfo

SELECT * FROM FundInfo
WHERE FundInfo.type='QDII'

UPDATE FundInfo
INNER JOIN IndexFund ON FundInfo.code=IndexFund.code
SET FundInfo.type='zsx'

UPDATE FundInfo
INNER JOIN QDII ON FundInfo.code=QDII.code
SET FundInfo.type='QDII'
```