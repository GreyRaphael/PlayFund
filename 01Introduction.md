# Fund Introduction

- [Fund Introduction](#fund-introduction)
  - [Fund knowledge](#fund-knowledge)
  - [TianTian Fund](#tiantian-fund)
  - [Tonghuashun Funds](#tonghuashun-funds)
  - [Ant Funds](#ant-funds)

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

example: 下载包含所有基金费率的htmls

```py
import re
import requests

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64; rv:61.0) Gecko/20100101 Firefox/61.0",
}
session = requests.Session()

home_url='http://www.xsdaili.com'
pat0=re.compile(r'<a href="/dayProxy/ip/(\d+)\.html">')
res0=session.get(home_url, headers=headers)
url=f'http://www.xsdaili.com/dayProxy/ip/{pat0.search(res0.text)}.html'

res=session.get(url, headers=headers)
pat=re.compile(r'(\d+\.\d+\.\d+\.\d+:\d+)@(\w+)#')
all_ip_port=pat.findall(res.text)

all_addr=[]
for item in all_ip_port:
    all_addr.append(f'{item[1]}://{item[0]}')

print(sorted(all_addr))
```

```py
import mysql.connector
import requests
import random
import concurrent.futures

# Connect to server
cnx = mysql.connector.connect(host="127.0.0.1", port=3306, db='THS_Fund', user="root",password="xxxxxx")
cur = cnx.cursor()

def get_codes():
    # read from db
    cur.execute('SELECT code FROM FundInfo')
    funds = cur.fetchall()
    return list(*zip(*funds))

def get_proxies():
    with open('proxy_list.txt') as file:
        return eval(file.read())

proxies_list=get_proxies()
fund_list=get_codes()

s = requests.Session()
s.headers.update({'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:69.0) Gecko/20100101 Firefox/69.0"})

def download_data(code):
    proxies = {'https': random.choice(proxies_list),}
    try:
        r = s.get(f'http://fund.10jqka.com.cn/{code}/interduce.html#rates', proxies=proxies).content
        with open(f'Data/{code}.html', 'wb') as file:
            file.write(r)
    except Exception as e:
        print(code, e)
        with open('log.txt', 'a') as file:
            file.write(code)
            file.write('\n')

with concurrent.futures.ThreadPoolExecutor(max_workers=32) as executor:
    infodict_futures = [executor.submit(download_data, code) for code in fund_list]
```

exmple: 利用下载的htmls来提取卖出费率

```py
import re
import os
import json

pat=re.compile(r'(\d+)[\u4e00-\u9fa5\\(\)]+</li>\r\n                            <li class="" style="width:270px;">([\d\.]+)%')

def filter_feilv(feilv_list):
    for i, f in enumerate(feilv_list):
        if f[0] == '7':
            return feilv_list[i:]

bad_funds=[]
feilv={}
for html in os.listdir('Data'):
    with open(f'Data/{html}', 'rb') as file:
        txt=file.read().decode('utf8', errors='ignore')
        if txt:
            feilv_list=filter_feilv(pat.findall(txt))
            feilv[html[:-5]]=feilv_list
        else:
            bad_funds.append(html[:-5])

temp_funds=[k for k in feilv if not feilv[k]]

len(bad_funds) # 47
len(temp_funds) # 82

len(feilv) # 4571
for code in temp_funds:
    del feilv[code]
len(feilv) # 4489

new_feilv={}
for k in feilv:
    v=feilv[k]
    zv=list(zip(*v))
    try:
        new_v=list(map(list, zip(zv[0][:-1], zv[1][1:])))
        for t in new_v:
            if t[0]=='1':
                t[0]='365'
            elif t[0]=='2':
                t[0]='730'
            elif t[0]=='3':
                t[0]='1095'
            elif t[0]=='4':
                t[0]='1460'
            elif t[0]=='5':
                t[0]='1825'  
        new_feilv[k]=new_v
    except Exception as e:
        print(k, e)


with open('data.txt', 'w') as file:
    for k in new_feilv:
        file.write(k)
        file.write(';')
        file.write(json.dumps(new_feilv[k]))
        file.write('\n')
```

```py
import re

pat=re.compile(r'(\d+)[\u4e00-\u9fa5\\(\)]+</li>\r\n                            <li class="" style="width:270px;">([\d\.]+)%')

high_fee={}
def filter_fee(fee_list):
    for i, f in enumerate(fee_list):
        if f[0] in ['1','15', '30', '180']:
            return fee_list[i:]

def filter_file(code):
    with open(f'Data/{code}.html', 'rb') as file:
        txt=file.read().decode('utf8', errors='ignore')
        high_fee[code]=filter_fee(pat.findall(txt))

zero_fee={}
# temp_funds.txt经过了人工分析
with open('temp_funds.txt') as file:
    for line in file:
        code, status=line.split(',')
        if status == '0\n':
            zero_fee[code]='0.00'
        elif status =='apply\n':
            filter_file(code)

# len(temp_funds) 
# 82: 28+47+7, 其中7中包含5个坏数据和2个好数据: 217022, 217023
# 加上之前的4489个好数据，总共4489+28+47+2=4566个好数据
len(zero_fee) # 28
len(high_fee) # 47

new_high_fee={}
for k in high_fee:
    v=high_fee[k]
    zv=list(zip(*v))
    try:
        new_v=list(map(list, zip(zv[0][:-1], zv[1][1:])))
        for t in new_v:
            if t[0]=='1':
                t[0]='365'
            elif t[0]=='2':
                t[0]='730'
            elif t[0]=='3':
                t[0]='1095'
            elif t[0]=='4':
                t[0]='1460'
            elif t[0]=='5':
                t[0]='1825'  
        new_high_fee[k]=new_v
    except Exception as e:
        print(k, e)

with open('data.txt', 'a') as file:
    for k in new_high_fee:
        file.write(k)
        file.write(';')
        file.write(json.dumps(new_high_fee[k]))
        file.write('\n')

with open('data.txt', 'a') as file:
    for k in zero_fee:
        file.write(k)
        file.write(';')
        file.write(zero_fee[k])
        file.write('\n')
```

example: 同花顺涨跌幅估算

```py
import requests

s=requests.Session()
s.headers.update({'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:69.0) Gecko/20100101 Firefox/69.0"})
r=s.get('http://gz-fund.10jqka.com.cn/?module=api&controller=index&action=chart&info=vm_fd_JSZ502&start=1445').text


nets=r[-26:-1].split(',')
net_before=eval(nets[2])
net_now=eval(nets[1])
rate=(net_now-net_before)/net_before*100

result=f'{rate:.2f}%'
```

## Ant Funds

example: get all fundinfo

```py
import requests
import re
import pandas as pd

pat=re.compile(r',"csrf":"(.+?)",')
s=requests.Session()

# get csrf
r=s.get('https://www.fund123.cn/fund')
csrf=pat.search(r.text).group(1)

true=True
Ant_Funds=[]
for i in range(1, 218):
    res=s.post(f'https://www.fund123.cn/api/fund/queryFundList?_csrf={csrf}', json={'pageNum':i})
    Ant_Funds.extend(eval(res.text)['valuedatalist']['listData'])

len(Ant_Funds) # 4340

df=pd.DataFrame(Ant_Funds)
# get fundCode, fundName, productID
df.to_csv('AntFunds.csv', columns=['fundCode', 'fundName', 'key'], index=False, header=False)
```

example: complete auto by AntFortune data

```py
import mysql.connector
import requests
import smtplib
from email.mime.text import MIMEText
import time
import concurrent.futures
import re
import schedule


def get_codes():
    cnx = mysql.connector.connect(host="127.0.0.1", port=3306, db='AntFund', user="root",password="xxxxxx")
    cur = cnx.cursor()
    cur.execute(
        '''
        SELECT ChosenFunds.fund_code, FundInfo.productID, FundInfo.name
        FROM ChosenFunds
        LEFT JOIN FundInfo
        ON ChosenFunds.fund_code=FundInfo.`code`
        '''
    )
    fund_list = cur.fetchall()
    cnx.close()
    return fund_list


pat=re.compile(r'"csrf":"(.+?)",')
true=True

def scrab_data(code, productID, name):
    s=requests.Session()
    r=s.get(f'https://www.fund123.cn/matiaria?fundCode={code}').text
    
    csrf=pat.search(r).group(1)
    today_string=time.strftime('%Y-%m-%d')
    post_data={
        'endTime': today_string,
        'format': 'true',
        'limit': 200,
        'productId': productID,
        'source': "WEALTHBFFWEB",
        'startTime': today_string
    }
    r_j=s.post(f'https://www.fund123.cn/api/fund/queryFundEstimateIntraday?_csrf={csrf}', json=post_data).text
    forecast_data=eval(r_j)['list'][-1]
    forecast_data['code']=code
    forecast_data['name']=name
    return forecast_data

def get_data(fund_code_list):
    # scrab data by threadpool
    with concurrent.futures.ThreadPoolExecutor(max_workers=32) as executor:
        infodict_futures = [executor.submit(scrab_data, *item) for item in fund_code_list]
        return [f.result() for f in infodict_futures]

def evaluate_data(info_dicts):
    to_buy = []
    to_sell = []
    for info in info_dicts:
        growth_rate = eval(info['forecastGrowth'])
        info['forecastGrowth']=growth_rate*100
        if growth_rate < -0:
            to_buy.append({key:info[key] for key in ['code', 'name', 'forecastGrowth']})
        elif growth_rate > 0:
            to_sell.append({key:info[key] for key in ['code', 'name', 'forecastGrowth']})
    return to_buy, to_sell


def generate_report(to_buy, to_sell):
    # sort data
    report_buy = sorted(to_buy, key=lambda d: d['forecastGrowth'])
    report_sell = sorted(to_sell, key=lambda d: d['forecastGrowth'], reverse=True)
    # string the data
    report_buy = [
        f"{d['code']}, {d['name']}, {d['forecastGrowth']:.3f}" for d in report_buy]
    report_sell = [
        f"{d['code']}, {d['name']}, {d['forecastGrowth']:.3f}" for d in report_sell]
    # generate report
    return '大盘预测跌(建议买入):\n'+'%\n'.join(report_buy) + \
        '%\n\n大盘预测涨(建议抛售):\n'+'%\n'.join(report_sell)+'%'


def send_mail(report):
    cnx = mysql.connector.connect(host="127.0.0.1", port=3306, db='AntFund', user="root",password="xxxxxx")
    cur = cnx.cursor()
    cur.execute('SELECT email FROM UserInfo')
    receivers = list(*zip(*cur.fetchall()))
    cnx.close()
    
    sender = 'gewei@pku.edu.cn'

    msg = MIMEText(report)
    msg['From'] = f'Wei Ge<{sender}>'  # Wei Ge表示显示的名字
    msg['To'] = ';'.join(receivers)
    msg['Subject'] = f"Fund Report: {time.strftime('%Y-%m-%d %H:%M:%S')}"

    try:
        mail_server = smtplib.SMTP_SSL('mail.pku.edu.cn', 465)

        user_name = sender
        user_pwd = 'Grey631331'
        mail_server.login(user_name, user_pwd)

        mail_server.sendmail(sender, receivers, msg.as_bytes())
    except Exception as e:
        print('send mail failed:', e)
    else:
        print(f"send mail success! at {time.strftime('%Y-%m-%d %H:%M:%S')}")


def task():
    fund_list=get_codes()
    forecast_dicts=get_data(fund_list)
    to_buy, to_sell=evaluate_data(forecast_dicts)
    report=generate_report(to_buy, to_sell)
    send_mail(report)


task_clock = "14:50"
schedule.every().monday.at(task_clock).do(task)
schedule.every().tuesday.at(task_clock).do(task)
schedule.every().wednesday.at(task_clock).do(task)
schedule.every().thursday.at(task_clock).do(task)
schedule.every().friday.at(task_clock).do(task)

while True:
    schedule.run_pending()
    time.sleep(1)
```

example: update all netvalue

```py
import requests
import re
import mysql.connector
import json
import concurrent.futures


def get_codelist():
    cnx = mysql.connector.connect(host="127.0.0.1", port=3306, db='AntFund', user="root", password="xxxxxx")
    cur = cnx.cursor()
    cur.execute('SELECT code FROM FundInfo')
    fund_list = cur.fetchall()
    cnx.close()
    return [item[0] for item in fund_list]


pat_equity = re.compile(r'(\d+),"y":(\d+.\d+),"equityReturn":')


def update_netvalues(code):
    r=requests.get(f'http://fund.eastmoney.com/pingzhongdata/{code}.js').text
    equity = [(item[0][:-3], item[1]) for item in pat_equity.findall(r)]
    # equity = {item[0][:-3]:item[1] for item in pat_equity.findall(r)}
    equity_str = json.dumps(equity)
    # connct to mysql
    cnx = mysql.connector.connect(host="127.0.0.1", port=3306, db='AntFund', user="root", password="xxxxxx")
    cur = cnx.cursor()
    cur.execute(f"UPDATE NetValue set fundNetValues='{equity_str}' WHERE code={code}")
    cnx.commit()
    cnx.close()

def update_all(code_list):
    with concurrent.futures.ThreadPoolExecutor(max_workers=32) as executor:
        for code in code_list:
            executor.submit(update_netvalues, code)

def task():
    code_list = get_codelist()
    print(len(code_list))
    update_all(code_list)
    print('update success')

if __name__ == "__main__":
    task()
```

example: get netvalues from database

```py
import mysql.connector

def get_netvalues(code):
    cnx = mysql.connector.connect(host="127.0.0.1", port=3306, db='AntFund', user="root",password="xxxxxxxxxxx")
    cur = cnx.cursor()
    cur.execute(f"SELECT * FROM NetValue WHERE code={code}")
    netvalue_list=eval(cur.fetchone())
    cur.close()
    return netvalue_list
```

example: important auto fund program for linux

```py
import mysql.connector
import requests
import smtplib
from email.mime.text import MIMEText
import time
import concurrent.futures
import re
import numpy as np
from scipy.interpolate import CubicSpline
from datetime import datetime, timedelta, date
import schedule

def get_chosen_funds():
    cnx = mysql.connector.connect(
        host="127.0.0.1", port=3306, db='AntFund', user="root", password="xxxxxx")
    cur = cnx.cursor()
    cur.execute(
        '''
        SELECT ChosenFunds.fund_code, FundInfo.productID, FundInfo.name
        FROM ChosenFunds
        LEFT JOIN FundInfo
        ON ChosenFunds.fund_code=FundInfo.`code`
        '''
    )
    fund_list = cur.fetchall()
    cnx.close()
    return fund_list


pat_csrf = re.compile(r'"csrf":"(.+?)",')
true = True


def scrab_forecast_dict(code, productID, name):
    s = requests.Session()

    r = s.get(f'https://www.fund123.cn/matiaria?fundCode={code}').text
    csrf = pat_csrf.search(r).group(1)
    today_string = time.strftime('%Y-%m-%d')
    post_data = {
        'endTime': today_string,
        'format': 'true',
        'limit': 200,
        'productId': productID,
        'source': "WEALTHBFFWEB",
        'startTime': today_string
    }
    r_j = s.post(
        f'https://www.fund123.cn/api/fund/queryFundEstimateIntraday?_csrf={csrf}', json=post_data).text

    forecast_dict = eval(r_j)['list'][-1]
    forecast_dict['code'] = code
    forecast_dict['name'] = name
    return forecast_dict


def get_forecast_dicts(fund_list):
    with concurrent.futures.ThreadPoolExecutor(max_workers=32) as executor:
        forecast_futures = [executor.submit(
            scrab_forecast_dict, *fund) for fund in fund_list]
        return [f.result() for f in forecast_futures]


def get_tradeinfo(code, netvalue_dict, forecastNetValue):
    # get tradeinfo & fee
    cnx = mysql.connector.connect(
        host="127.0.0.1", port=3306, db='AntFund', user="root", password="xxxxxx")
    cur = cnx.cursor()
    cur.execute(f'SELECT * FROM TradeInfo WHERE fund_code="{code}"')
    trade_list = cur.fetchall()
    cur.execute(f'SELECT * FROM FundFee WHERE code={code}')
    fee_list = eval(cur.fetchone()[1])
    cnx.close()

    trade_info = []
    for t in trade_list:
        buy_date = t[2]
        buy_timestamp = f'{time.mktime(buy_date.timetuple()):.0f}000'
        buy_netvalue = eval(netvalue_dict[buy_timestamp])
        accumulated_rate = 100*(forecastNetValue/buy_netvalue-1)

        for i, item in enumerate(fee_list):
            hold_days = date.today()-buy_date
            day_span = timedelta(days=eval(item[0]))
            if hold_days < day_span:
                if i == 0:
                    trade_info.append(
                        {'buy_date': buy_date, 'share': t[3], 'feilv': 1.5, 'accumulatedRate': accumulated_rate})
                else:
                    trade_info.append({'buy_date': buy_date, 'share': t[3], 'feilv': eval(
                        fee_list[i-1][1]), 'accumulatedRate': accumulated_rate})
                break
            elif i == len(fee_list)-1:
                trade_info.append(
                    {'buy_date': buy_date, 'share': t[3], 'feilv': 0, 'accumulatedRate': accumulated_rate})
    return trade_info


pat_netvalue = re.compile(r'(\d+),"y":(\d+.\d+),"equityReturn":')


def analyse_dict(forecast_dict):
    code = forecast_dict['code']
    forecastNetValue = eval(forecast_dict['forecastNetValue'])
    forecastGrowthRate = 100*eval(forecast_dict['forecastGrowth'])
    forecast_dict['forecastNetValue'] = forecastNetValue
    forecast_dict['forecastGrowth'] = forecastGrowthRate

    # get all netvalues
    r = requests.get(f'http://fund.eastmoney.com/pingzhongdata/{code}.js').text
    netvalue_list = pat_netvalue.findall(r)

    # add tradeinfo for one code
    netvalue_dict = dict(netvalue_list)
    forecast_dict['tradeinfo'] = get_tradeinfo(
        code, netvalue_dict, forecastNetValue)

    # get last 14 days netvalues
    N = 14
    fortnight_netvalue_list = [eval(item[1]) for item in netvalue_list[-N:]]
    fortnight_netvalue_array = np.array(fortnight_netvalue_list)

    # add last 3 days growth rate & accumulated growth rate
    fortnight_growth_rate = 100 * \
        (fortnight_netvalue_array[1:]/fortnight_netvalue_array[:-1]-1)
    forecast_dict['last3d'] = f'[{fortnight_growth_rate[-3]:5.2f},{fortnight_growth_rate[-2]:5.2f},{fortnight_growth_rate[-1]:5.2f}]'
    forecast_dict['accu3d'] = 100 * \
        (fortnight_netvalue_list[-1]/fortnight_netvalue_list[-4]-1)

    # cubic spline predict today and tomorrow growth rate
    last_timestamp = eval(netvalue_list[-1][0])//1000
    forecast_timestamp = forecast_dict['time']//1000
    delta_days = (datetime.fromtimestamp(forecast_timestamp) -
                  datetime.fromtimestamp(last_timestamp)).days
    if delta_days == 0:
        fortnight_netvalues = fortnight_netvalue_array
    else:
        # with forecastNetValue
        new_fortnight_netvalue_list = fortnight_netvalue_list[1:]
        new_fortnight_netvalue_list.append(forecastNetValue)
        fortnight_netvalues = np.array(new_fortnight_netvalue_list)
    cs = CubicSpline(np.arange(1, N+1), fortnight_netvalues, bc_type='natural')
    netvalue_interpolate = cs(np.linspace(1, N, 3*N))
    diff1 = netvalue_interpolate[1:]-netvalue_interpolate[:-1]
    diff2 = diff1[1:]-diff1[:-1]
    forecast_dict['diff1'] = 100*diff1[-1]
    forecast_dict['diff2'] = 100*diff2[-1]
    # now forecast_dict contains:
    # time, forecastNetValue, forecastGrowth, code, name, tradeinfo, last3d, accu3d, diff1, diff2
    return forecast_dict


def analyse_dicts(forecast_dicts):
    with concurrent.futures.ThreadPoolExecutor(max_workers=32) as executor:
        analysed_futures = [executor.submit(
            analyse_dict, forecast_dict) for forecast_dict in forecast_dicts]
        return [f.result() for f in analysed_futures]


def seperate_dicts(analysed_dicts):
    to_buy = []
    to_sell = []
    to_hold = []
    for d in analysed_dicts:
        accu3d = d['accu3d']
        forecastGrowthRate = d['forecastGrowth']
        if abs(forecastGrowthRate) < 0.2 and abs((1+accu3d/100)*(1+forecastGrowthRate/100) -1) < 0.01 :
            to_hold.append(d)
        elif forecastGrowthRate <= -0.2 or (1+accu3d/100)*(1+forecastGrowthRate/100)-1 < -0.017:
            to_buy.append(d)
        elif forecastGrowthRate >= 0.6 or (1+accu3d/100)*(1+forecastGrowthRate/100)-1 > 0.017:
            to_sell.append(d)
        else:
            to_hold.append(d)
    return to_buy, to_sell, to_hold


def generate_report(to_buy, to_sell, to_hold):
    # sort date
    report_buy = sorted(to_buy, key=lambda d: d['accu3d'])
    report_sell = sorted(to_sell, key=lambda d: d['accu3d'], reverse=True)
    report_hold = sorted(to_hold, key=lambda d: d['forecastGrowth'], reverse=True)

    report_sell_html = [
        f"<div>{d['code']}|last3d:{d['last3d']},accu3d:<span style='color: #f00'>{d['accu3d']:5.2f}%</span>|predict:<span style='color:#f00'>{d['forecastGrowth']:6.3f}%</span>,diff=({d['diff1']:6.3f},{d['diff2']:6.3f})|{d['name']}</div>" for d in report_sell]

    private_report_sell_html = []
    for d in report_sell:
        tradeinfo_list = [
            f"<div>{t['buy_date']}|share:{t['share']:<7.2f}|feilv:{t['feilv']:4.2f}|{t['accumulatedRate']:5.2f}</div>" for t in d['tradeinfo']]
        tradeinfo = '\n'.join(tradeinfo_list)
        private_report_sell_html.append(
            f"<div>{d['code']}|last3d:{d['last3d']},accu3d:<span style='color:#f00'>{d['accu3d']:5.2f}%</span>|predict:<span style='color:#f00'>{d['forecastGrowth']:6.3f}%</span>,diff=({d['diff1']:6.3f},{d['diff2']:6.3f})|{d['name']}</div><div style='padding-left:80px'>{tradeinfo}</div>")

    # string the data
    report_buy_html = [
        f"<div>{d['code']}|last3d:{d['last3d']},accu3d:<span style='color: #0a0'>{d['accu3d']:5.2f}%</span>|predict:<span style='color:#0a0'>{d['forecastGrowth']:6.3f}%</span>,diff=({d['diff1']:6.3f},{d['diff2']:6.3f})|{d['name']}</div>" for d in report_buy]
    report_hold_html = [
        f"<div>{d['code']}|last3d:{d['last3d']},accu3d:<span style='color: #00f'>{d['accu3d']:5.2f}%</span>|predict:<span style='color: #00f'>{d['forecastGrowth']:6.3f}%</span>,diff=({d['diff1']:6.3f},{d['diff2']:6.3f})|{d['name']}</div>" for d in report_hold]

    # combine reports
    private_report='<b>买入:</b>'+'\n'.join(report_buy_html) + '<b>卖出:</b>'+'\n'.join(private_report_sell_html) + '<b>观望:</b>'+'\n'.join(report_hold_html)
    public_report='<b>买入:</b>'+'\n'.join(report_buy_html) + '<b>卖出:</b>'+'\n'.join(report_sell_html) + '<b>观望:</b>'+'\n'.join(report_hold_html)
    return private_report, public_report


def get_receivers():
    cnx = mysql.connector.connect(host="127.0.0.1", port=3306, db='AntFund', user="root",password="xxxxxx")
    cur = cnx.cursor()
    cur.execute('SELECT email FROM UserInfo')
    receivers = list(*zip(*cur.fetchall()))
    cnx.close()
    return receivers

def send_mail(report, receivers):
    sender = 'gewei@pku.edu.cn'

    msg = MIMEText(report, 'html')
    msg['From'] = f'Wei Ge<{sender}>'  # Wei Ge表示显示的名字
    msg['To'] = ';'.join(receivers)
    msg['Subject'] = f"Fund Report: {time.strftime('%Y-%m-%d %H:%M:%S')}"

    try:
        mail_server = smtplib.SMTP_SSL('mail.pku.edu.cn', 465)

        user_name = sender
        user_pwd = 'Grey631331'
        mail_server.login(user_name, user_pwd)

        mail_server.sendmail(sender, receivers, msg.as_bytes())
    except Exception as e:
        print('send mail failed:', e)
    else:
        print(f"send mail success! at {time.strftime('%Y-%m-%d %H:%M:%S')}")


def task():
    chosen_fund_list = get_chosen_funds()
    forecast_dicts = get_forecast_dicts(chosen_fund_list)
    analysed_dicts = analyse_dicts(forecast_dicts)
    to_buy, to_sell, to_hold = seperate_dicts(analysed_dicts)
    private_report, public_report = generate_report(to_buy, to_sell, to_hold)
    # send to myself
    send_mail(private_report, ['gewei@pku.edu.cn',])
    # send to others
    send_mail(public_report, get_receivers())


task_clock = "14:50"
schedule.every().monday.at(task_clock).do(task)
schedule.every().tuesday.at(task_clock).do(task)
schedule.every().wednesday.at(task_clock).do(task)
schedule.every().thursday.at(task_clock).do(task)
schedule.every().friday.at(task_clock).do(task)

while True:
    schedule.run_pending()
    time.sleep(1)
```