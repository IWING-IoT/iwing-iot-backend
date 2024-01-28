import numpy as np
import datetime
import requests
position = [13.8465664,100.5784414]
maxMovement = [0.004, 0.002]
temperature = [35, 95]
# Seconds   
sendInterval = [120, 600]
battery = 100

now = datetime.datetime.now()

lastThreeMonth = now - datetime.timedelta(days=3)


# Get Token
# res = requests.post('http://localhost:5573/api/user/signin', json={'email': 'withawat.t@ku.th', 'password': '123456789'})
# print(res.json().get('token'))
token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkZXZpY2VQaGFzZUlkIjoiNjVhZDNjNjBhMTEyNjI3MGU3ODExMDYzIiwiaWF0IjoxNzA1ODUyMDAwLCJleHAiOjEuOGUrMzR9.KnJg6sx6yfWHHurIYZkQy0lzQRPcMC3Sme7FMCOoizU'
url = f'http://localhost:5573/api/message/standalone'
count = 0

# Post data to /api/message/standalone until today start from lastThreeMonth
while lastThreeMonth < now:
    headers = {'Content-type': 'application/json',  'Authorization': 'Bearer ' + token}
    data = {
        "createdAt": lastThreeMonth.isoformat(),
        "latitude": position[0] + np.random.uniform(0, maxMovement[0]),
        "longitude": position[1] + np.random.uniform(0, maxMovement[1]),
        "temperature": np.random.uniform(temperature[0], temperature[1]),
        "battery": battery - np.random.uniform(0, 0.5),
        "simulate": True
    }

    requests.post(url, json=data,headers=headers)


    lastThreeMonth += datetime.timedelta(seconds=np.random.uniform(sendInterval[0], sendInterval[1]))
    count += 1
    position[0] = data['latitude']
    position[1] = data['longitude']
    battery = data['battery']

    res = requests.post(url, json=data,headers=headers)
    if battery < 0:
        battery = 100
print(count)
print(position)