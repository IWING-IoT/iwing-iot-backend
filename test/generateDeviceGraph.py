import numpy as np
import datetime
import requests
import time
from datetime import datetime

import math
import random


def generate_random_coordinates(center_lat, center_lon, radius_km, num_points):
    coordinates = []

    for _ in range(num_points):
        # Generate random distance and angle
        r = radius_km * math.sqrt(random.uniform(0, 1))
        theta = random.uniform(0, 2 * math.pi)

        # Calculate new latitude and longitude
        delta_lat = (
            r * math.cos(theta) / 110.574
        )  # 1 degree of latitude is approximately 110.574 km
        delta_lon = r * math.sin(theta) / (111.32 * math.cos(math.radians(center_lat)))

        new_lat = center_lat + delta_lat
        new_lon = center_lon + delta_lon

        coordinates.append((new_lat, new_lon))

    return coordinates


# # Example usage:
center_latitude = 16.7899714  # Example: New York City
center_longitude = 98.9176732
radius_kilometers = 5
num_points = 10000000

random_coordinates = generate_random_coordinates(
    center_latitude, center_longitude, radius_kilometers, num_points
)

# print(datetime.now().isoformat())
temperature = [35, 95]
battery = 100
url = f"http://localhost:5573/api/message/standalone"
token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkZXZpY2VQaGFzZUlkIjoiNjVhZDNjNjBhMTEyNjI3MGU3ODExMDZmIiwiaWF0IjoxNzA1ODUyMDAwLCJleHAiOjEuOGUrMzR9.12Bf4zad1WOcelITcgWDVWxtL5EErWfkMXMcl1CFqx0"


for lat, long in random_coordinates:
    headers = {"Content-type": "application/json", "Authorization": "Bearer " + token}
    data = {
        "createdAt": datetime.now().isoformat(),
        "latitude": lat,
        "longitude": long,
        "temperature": np.random.uniform(temperature[0], temperature[1]),
        "battery": battery - np.random.uniform(0, 0.00001),
    }
    print(data)

    requests.post(url, json=data, headers=headers)

    battery = data["battery"]

    if battery < 0:
        battery = 100

    time.sleep(np.random.uniform(10, 20))

# position = [15.8465664,100.5784414]
# maxMovement = [0.004, 0.002]
# temperature = [35, 95]
# # Seconds
# sendInterval = [120, 600]
# battery = 100


# Get Token
# res = requests.post('http://localhost:5573/api/user/signin', json={'email': 'withawat.t@ku.th', 'password': '123456789'})
# print(res.json().get('token'))
# token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkZXZpY2VQaGFzZUlkIjoiNjViNTUwOWRmZjNiZjhhZGIyNTE3NTZlIiwiaWF0IjoxNzA2MzgxNDY5LCJleHAiOjEuOGUrMzR9.x6hrSK1XyXwkcy23fNP-nkAZdRH2zSbpkv_Y9-32fP8'
# url = f'http://localhost:5573/api/message/gateway'
# count = 0

# # Post data to /api/message/standalone until today start from lastThreeMonth
# while 1:
#     headers = {'Content-type': 'application/json',  'Authorization': 'Bearer ' + token}
#     data = {
#         "nodeAlias": "N07",
#         "createdAt": datetime.now().isoformat(),
#         "latitude": position[0],
#         "longitude": position[1],
#         "temperature": np.random.uniform(temperature[0], temperature[1]),
#         "battery": battery - np.random.uniform(0, 0.5),
#     }
#     print(data)

#     requests.post(url, json=data,headers=headers)

#     count += 1
#     position[0] = data['latitude']
#     position[1] = data['longitude']
#     battery = data['battery']


#     if battery < 0:
#         battery = 100

#     time.sleep(np.random.uniform(10, 60))
# print(count)
# print(position)
