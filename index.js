const express = require('express');
const cors = require('cors')
const app = express()
require('dotenv').config()
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
var jwt = require('jsonwebtoken');

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Hello World!')
})


function verifyJwt(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return req.status(401).send('unauthorized access')
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded
        next()
    })

}

const uri = `mongodb+srv://${process.env.SECONAD_HAND_CAR_REACT_APP_DB_USERNAME}:${process.env.SECONAD_HAND_CAR_REACT_APP_DB_PASSWORD}@cluster0.5urggkk.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



async function run() {
    try {
        const usedCarCollection = client.db('carSelling').collection('AllCars');
        const usedMicroBusCollection = client.db('carSelling').collection('MicroBusCollection');
        const usedLuxuryCarCollection = client.db('carSelling').collection('LuxuryCarCollection');
        const bookings = client.db('carSelling').collection('bookingsCollection');
        const allUsers = client.db('carSelling').collection('userCollection')

        app.get('/usedCar', async (req, res) => {
            const query = {};
            const result = await usedCarCollection.find(query).toArray()
            res.send(result)
        })
        app.get('/usedMicroBus', async (req, res) => {
            const query = {};
            const result = await usedMicroBusCollection.find(query).toArray()
            res.send(result)
        })
        app.get('/luxuryCar', async (req, res) => {
            const query = {};
            const result = await usedLuxuryCarCollection.find(query).toArray()
            res.send(result)
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body
            const query = {
                VehicaleName: booking.vehiclesName,
                email: booking.email,
                price: booking.resale,
                image: booking.image,
                location: booking.location
            }
            const alreadyBooked = await bookings.find(query).toArray()
            if (alreadyBooked.length) {
                const message = `You Already Have a Booked on ${booking.vehiclesName} this vehicles`
                return res.send({ acknowledged: false, message })
            }
            const result = await bookings.insertOne(query)
            res.send(result)
        })
        app.get('/bookedvehicles', verifyJwt, async (req, res) => {
            const email = req.query.email
            const decodedEmail = req.decoded.email
            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: email }
            const result = await bookings.find(query).toArray()
            res.send(result)
        })
        // JWT TOKEN
        app.get('/jwt', async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const user = await allUsers.findOne(query)
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1hr' })
                return res.send({ accessToken: token })
            }
            res.status(403).send({ accessToken: '' })

        })
        // user admin part
        app.get('/users', async (req, res) => {
            const query = {}
            const result = await allUsers.find(query).toArray()
            res.send(result)
        })
        app.post('/users', async (req, res) => {
            const user = req.body
            const result = await allUsers.insertOne(user)
            res.send(result)
        })
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email
            const query = { email }
            const user = await allUsers.findOne(query)
            res.send({ isAdmin: user?.owner === 'admin' });
        })

        app.put('/users/admin/:id', verifyJwt, async (req, res) => {
            const email = req.decoded.email
            const query = { email: email }
            const user = await allUsers.findOne(query)
            if (user?.owner !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const id = req.params.id
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    owner: 'admin'
                }
            }
            const result = await allUsers.updateOne(filter, updatedDoc, options)
            res.send(result)
        })
        app.delete('/delete/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const user = await allUsers.deleteOne(query)
            res.send(user)
        })

    }
    finally {

    }
}
run().catch(console.dir)


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})