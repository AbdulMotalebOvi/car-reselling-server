const express = require('express');
const cors = require('cors')
const app = express()
require('dotenv').config()
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
var jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)

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
        const electronicCarCollection = client.db('carSelling').collection('ElectronicCars');
        const usedMicroBusCollection = client.db('carSelling').collection('MicroBusCollection');
        const usedLuxuryCarCollection = client.db('carSelling').collection('LuxuryCarCollection');
        const bookings = client.db('carSelling').collection('bookingsCollection');
        const allUsers = client.db('carSelling').collection('userCollection')
        const addProducts = client.db('carSelling').collection('addProductsCollection')
        const payments = client.db('carSelling').collection('paymentCollection')

        // Electronic Car
        app.post('/electronicCarFind', async (req, res) => {
            const car = req.body;
            const result = await electronicCarCollection.insertOne(car)
            res.send(result)
        })
        app.get('/electronicCar', async (req, res) => {
            const query = {};
            const result = await electronicCarCollection.find(query).toArray()
            res.send(result)
        })

        // microbus
        app.post('/usedMicroBus', async (req, res) => {
            const car = req.body;
            const result = await usedMicroBusCollection.insertOne(car)
            res.send(result)
        })
        app.get('/usedMicroBus', async (req, res) => {
            const query = {};
            const result = await usedMicroBusCollection.find(query).toArray()
            res.send(result)
        })
        // luxury car
        app.post('/luxuryCar', async (req, res) => {
            const car = req.body;
            const result = await usedLuxuryCarCollection.insertOne(car)
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
                VehicaleName: booking.productsName,
                email: booking.email,
                price: booking.Resale,
                image: booking.image,
                location: booking.Location,
                Number: booking.number
            }
            const alreadyBooked = await bookings.find(query).toArray()
            if (alreadyBooked.length) {
                const message = `You Already Have a Booked on ${booking.productsName} this vehicles`
                return res.send({ acknowledged: false, message })
            }
            const result = await bookings.insertOne(query)
            res.send(result)
        })


        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await bookings.findOne(query)
            res.send(result)
        })

        // payment
        app.post('/payments', async (req, res) => {
            const payment = req.body
            const result = await payments.insertOne(payment)
            const id = payment.bookingId
            const filter = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transaction: payment.transactionId
                }
            }
            const updatedResult = await bookings.updateOne(filter, updatedDoc)
            res.send(result)
        })

        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body
            const price = booking.price
            const amount = price * 100

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                "payment_method_types": [
                    "card"
                ],
            })
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })

        app.get('/bookedvehicles', verifyJwt, async (req, res) => {
            const email = req.query.email
            console.log(email);
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
            // console.log(email)
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

        // add products

        app.post('/addProduct', async (req, res) => {
            const product = req.body
            const result = await addProducts.insertOne(product)
            res.send(result)
        })
        // seller role
        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email
            const query = { email }
            const user = await allUsers.findOne(query)
            res.send({ isSeller: user?.Role === 'Seller' });
        })
        // buyer role
        app.get('/users/buyer/:email', async (req, res) => {
            const email = req.params.email
            const query = { email }
            const user = await allUsers.findOne(query)
            res.send({ isBuyer: user?.Role === 'Buyer' });
        })
        // all seller and buyer seen by admin
        app.get('/seller', async (req, res) => {
            const query = { Role: 'Seller' }
            const user = await allUsers.find(query).toArray()
            res.send(user)
        })
        app.get('/buyer', async (req, res) => {
            const query = { Role: 'Buyer' }
            const user = await allUsers.find(query).toArray()
            res.send(user)
        })
        // admin role
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