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

