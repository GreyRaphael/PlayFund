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

## Get Recent equity

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

example: buy or sell fund suggestion

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