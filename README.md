# ufc-scraper-restapi

UFC website scraper / REST API

## Installation

Node.js is required to run this project locally. Node can be downloaded at [nodejs.org](https://nodejs.org/en/).

Clone the repo

```sh
git clone https://github.com/n-ulricksen/ufc-scraper-restapi.git
cd ufc-scraper-restapi
```

Install dependencies

```sh
npm install
```

## Usage

Start the server.

```sh
npm start
```

Check out the running application at

```
localhost:8080
```

## Routes

List all UFC athletes.
```
GET /athletes
```

Retrieve a specific UFC fighter profile.
```
GET /athletes/:athleteId
```

List all UFC divisions and division champions.
```
GET /divisions
```

List the top contenders for a specific UFC division.
```
GET /divisions/:divisionId
```

## Contributing

Pull requests welcome and appreciated!

## License

[MIT](https://choosealicense.com/licenses/mit/)

