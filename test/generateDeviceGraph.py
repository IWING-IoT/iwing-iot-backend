import numpy as np
import datetime
import requests
import time
from datetime import datetime

import math
import random


# def generate_random_coordinates(center_lat, center_lon, radius_km, num_points):
#     coordinates = []

#     for _ in range(num_points):
#         # Generate random distance and angle
#         r = radius_km * math.sqrt(random.uniform(0, 1))
#         theta = random.uniform(0, 2 * math.pi)

#         # Calculate new latitude and longitude
#         delta_lat = (
#             r * math.cos(theta) / 110.574
#         )  # 1 degree of latitude is approximately 110.574 km
#         delta_lon = r * math.sin(theta) / (111.32 * math.cos(math.radians(center_lat)))

#         new_lat = center_lat + delta_lat
#         new_lon = center_lon + delta_lon

#         coordinates.append((new_lat, new_lon))

#     return coordinates


# # # Example usage:
# center_latitude = 16.7899714  # Example: New York City
# center_longitude = 98.9176732
# radius_kilometers = 5
# num_points = 10000000

# random_coordinates = generate_random_coordinates(
#     center_latitude, center_longitude, radius_kilometers, num_points
# )

# print(datetime.now().isoformat())
# temperature = [35, 95]
# battery = 100
# url = f"http://localhost:5573/api/message/standalone"
# token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkZXZpY2VQaGFzZUlkIjoiNjVhZDNjNjBhMTEyNjI3MGU3ODExMDZmIiwiaWF0IjoxNzA1ODUyMDAwLCJleHAiOjEuOGUrMzR9.12Bf4zad1WOcelITcgWDVWxtL5EErWfkMXMcl1CFqx0"


# for lat, long in random_coordinates:
#     headers = {"Content-type": "application/json", "Authorization": "Bearer " + token}
#     data = {
#         "createdAt": datetime.now().isoformat(),
#         "latitude": lat,
#         "longitude": long,
#         "temperature": np.random.uniform(temperature[0], temperature[1]),
#         "battery": battery - np.random.uniform(0, 0.00001),
#     }
#     print(data)

#     requests.post(url, json=data, headers=headers)

#     battery = data["battery"]

#     if battery < 0:
#         battery = 100

#     time.sleep(np.random.uniform(10, 20))

position = [13.8443042,100.5677531]
positions = [[13.8443042, 100.5677531], [13.846342,100.5677531], [13.846342,100.5877531 ],[13.8443042,100.5877531]]
maxMovement = [0.004, 0.002]
temperature = [35, 95]
# # Seconds
sendInterval = [5, 30]
battery = 30


# Get Token
token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkZXZpY2VQaGFzZUlkIjoiNjViODlmYzlhNDE2ZmE1ODE2ZWQ0MDk5IiwiaWF0IjoxNzA2NTk4MzQ1LCJleHAiOjEuOGUrMzR9.5E6yJ1l6gGA47F3N0Ouphtekf5e5vFmm2w8Gze2t_tw'
url = f'http://localhost:5573/api/message/standalone'
count = 0
i = 0

# Post data to /api/message/standalone until today start from lastThreeMonth
while 1:
    headers = {'Content-type': 'application/json',  'Authorization': 'Bearer ' + token}
    # data = {
    #     "nodeAlias": "N4",
    #     "createdAt": datetime.now().isoformat(),
    #     "latitude": position[0] + np.random.uniform(0, maxMovement[0]),
    #     "longitude": position[1] + np.random.uniform(0, maxMovement[1]),
    #     "temperature": np.random.uniform(temperature[0], temperature[1]),
    #     "battery": battery - np.random.uniform(0, 0.05),
    # }
    data = {
        # "nodeAlias": "N4",
        "createdAt": datetime.now().isoformat(),
        "latitude": position[0] + np.random.uniform(0, maxMovement[0]),
        "longitude": position[1] + np.random.uniform(0, maxMovement[1]),
        "temperature": np.random.uniform(temperature[0], temperature[1]),
        "battery": battery - np.random.uniform(0, 0.05),
    }
    print(data)

    requests.post(url, json=data,headers=headers)

    count += 1
    position[0] = data['latitude']
    position[1] = data['longitude']
    battery = data['battery']

    i += 1
    if battery < 0:
        battery = 100

    time.sleep(np.random.uniform(sendInterval[0], sendInterval[1]))
print(count)
print(position)

tokenList = ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkZXZpY2VQaGFzZUlkIjoiNjViN2VkOTUwOTk3MjU4MTUwZGI2ODVlIiwiaWF0IjoxNzA2NTUyNzI1LCJleHAiOjEuOGUrMzR9.0v6CFDK6UwQEC3lm53CjsDnbGy9T_WZx4OBH7O4f4hw','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkZXZpY2VQaGFzZUlkIjoiNjViN2VkOTYwOTk3MjU4MTUwZGI2ODY1IiwiaWF0IjoxNzA2NTUyNzI2LCJleHAiOjEuOGUrMzR9.v5jqMJ_z-ziCZy7bkNJ9i5qUfnNIlv3wp9HeV9Y1kFg','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkZXZpY2VQaGFzZUlkIjoiNjViN2VkOTYwOTk3MjU4MTUwZGI2ODZjIiwiaWF0IjoxNzA2NTUyNzI2LCJleHAiOjEuOGUrMzR9.3rC6rHPgnctAQJWJ1zaJWojvWtZEWr2RsuszwE4j1Qc']

# while count < 50:
#     for i in tokenList:
