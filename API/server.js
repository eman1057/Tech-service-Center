const express = require('express');
const crypto = require('crypto');
const session = require('express-session');
const bodyParser = require('body-parser');
const MySQLStore = require('express-mysql-session')(session);
const serverUtils = require('./serverUtils');

// Database connection details
const config = {
    user: 'yilliee',
    password: '1221',  // Replace with your password
    host: 'localhost',
    database: 'Tech911'
};

// create a session management system
const sessionConfig = {
    secret: crypto.randomBytes(20).toString('hex'),
    resave: false,
    saveUninitialized: false,
    store: new MySQLStore(
        {
            ...config,
            createDatabaseTable: false,
            schema: {
                tableName: 'SessionStorage',
                columnNames: {
                    session_id: 'session_id',
                    expires: 'expires',
                    data: 'data'
                }
            }
        }
    ),
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: false, // Set to true if using HTTPS
        httpOnly: true // Prevent client-side access to cookies
    }
};

const app = express();


app.use((req, res, next) => { // Modified req for readability
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, credentials'); 
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PUT');
    next();
});

app.use(session(sessionConfig));
app.use(bodyParser.json({limit: '50mb'}));
app.use(express.json());

// Middleware to check if user is authenticated
const authenticateUser = (req, res, next) => {
    if (req.session.userID) {
        next();
    } else {
        res.status(401).json({ message: 'Unauthorized' });
    }
};

app.post('/verifyEmail',
    async (req, res) => {
        const { email, accountType } = req.body;

        const emailExists = await serverUtils.verifyEmail(config, email, accountType);

        res.json({ emailExists });
    }
);

app.post('/verifyCredentials',
    async (req, res) => {
        const { email, pass } = req.body;

        const userDetails = await serverUtils.getUserDetails(config, email, pass);

        if ( userDetails ) {
            req.session.userID = userDetails.id;

            res.json({
                username: userDetails.username,
                display_name: userDetails.display_name,
                profile_pic: userDetails.profile_pic ? userDetails.profile_pic.toString('base64') : null
            });;

            return;
        }
        res.status(401).json({ message: 'Invalid credentials' });
    }
);

app.get('/authenticate', authenticateUser, async (req, res) => {
    res.json({ message: 'Authenticated' });
});

app.put('/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logout successful' });
});

app.get('/getPictures',
    async (_, res) => {
        const pictureList = await serverUtils.getPictures(config);

        res.json(pictureList);
    }
);

app.get('/getUserDetails', authenticateUser,
    async (req, res) => {
        const userID = req.session.userID;

        const userDetails = await serverUtils.getExtraUserDetails(config, userID);

        res.json(userDetails);
    }
);

app.post('/getListingDetails',
    async (req, res) => {
        const { listingID } = req.body;

        const listings = await serverUtils.getListingsDetails(config, listingID);

        res.json(listings);
    }
);

app.post('/getListings',
    async (req, res) => {
        const { featured_only, count } = req.body;

        const listings = await serverUtils.getListings(config, featured_only, count);
    
        res.json(listings)
    }
);

app.post('/getReviews',
    async (req, res) => {
        const { count, listing_id } = req.body;

        const top_reviews = await serverUtils.getReviews(config, listing_id, count);
    
        res.json(top_reviews)
    }
);

app.post('/getUsersOrders', authenticateUser,
    async (req, res) => {
        const userID = req.session.userID;
        
        orderList = await serverUtils.getOrders(config, userID);

        res.json({ orderList });
    }
);

app.put('/addUser',
    async (req, res) => {
        const { username, displayName, address, phone, email, password, accountType } = req.body;

        const status = await serverUtils.addUser(config, accountType, username, displayName, email, password, phone, null, address, null);

        if (status) {
            res.json({ message: 'Adding user successful' });
        } else {
            res.status(500).json({ message: 'Adding user unsuccessful' });
        }
    }
);

app.post('/makePurchase', authenticateUser, 
    async (req, res) => {
        const { listing_id, reservation_time, quantity, total_cost, payment_proof_base64 } = req.body;
        const userID = req.session.userID;

        const status = await serverUtils.makePurchase(config, userID, listing_id, reservation_time, quantity, total_cost, payment_proof_base64);

        if (status) {
            res.json({ message: 'Purchase successful' });
        } else {
            res.status(500).json({ message: 'Purchase unsuccessful' });
        }
    }
);

app.put('/updateUserDetails', authenticateUser,
    async (req, res) => {
        const userID = req.session.userID;
        const { display_name, address, phone_no, bio, profile_pic_base64 } = req.body;
        
        const status = await serverUtils.updateUserDetails(config, userID, display_name, address, phone_no, bio, profile_pic_base64);

        if (status) {
            res.json({ message: 'Update successful' });
        } else {
            res.status(500).json({ message: 'Update unsuccessful' });
        }
    }
);

app.get('/getSelectedServicePackage', authenticateUser,
    async (req, res) => {
        const userID = req.session.userID;

        const selectedPackage = await serverUtils.getSelectedServicePackage(config, userID);

        res.json(selectedPackage);
    }
);

app.get('/getServicePackagesList',
    async (_, res) => {
        const servicePackages = await serverUtils.getServicePackagesList(config);

        res.json({
            packages: servicePackages
        });
    }
);

app.put('/updateServicePackage', authenticateUser,
    async (req, res) => {
        const userID = req.session.userID;
        const { new_package } = req.body;

        const status = await serverUtils.updateServicePackage(config, userID, new_package);

        if (status) {
            res.json({ message: 'Update successful' });
        } else {
            res.status(500).json({ message: 'Update unsuccessful' });
        }
    }
);

app.get('/getServiceTypes', 
    async (_, res) => {
        const services_list = await serverUtils.getServiceTypes(config);

        res.json({
            service_type_list: services_list
        });
    }
);

app.get('/getDeviceTypes', 
    async (_, res) => {
        const devices_list = await serverUtils.getDeviceTypes(config);

        res.json({
            device_type_list: devices_list
        });
    }
);

app.get('/getPendingVerificationRequests', authenticateUser,
    async (_, res) => {

        const pendingRequests = await serverUtils.getPendingVerificationRequests(config);

        res.json({
            'requests': pendingRequests
        });
    }
);

app.put('/updateVerificationRequests', authenticateUser,
    async (req, res) => {
        const { user_id, status } = req.body;

        const updatedStatus = await serverUtils.updateVerificationRequestStatus(config, user_id, status);

        if (updatedStatus) {
            res.json({ message: 'Update successful' });
        } else {
            res.status(500).json({ message: 'Update unsuccessful' });
        }
    }
);

app.get('/getPendingPaymentRequests', authenticateUser,
    async (_, res) => {

        const paymentRequests = await serverUtils.getPaymentRequests(config);

        res.json({
            'requests': paymentRequests
        });
    }
);

app.put('/updatePaymentRequests', authenticateUser,
    async (req, res) => {
        const { order_id, status } = req.body;

        const updatedStatus = await serverUtils.updatePaymentRequestStatus(config, order_id, status);

        if (updatedStatus) {
            res.json({ message: 'Update successful' });
        } else {
            res.status(500).json({ message: 'Update unsuccessful' });
        }
    }
);

app.get('/getVerificationStatus', authenticateUser,
    async (req, res) => {
        const userID = req.session.userID;

        const verificationStatus = await serverUtils.getVerificationStatus(config, userID);

        res.json({ status: verificationStatus });
    }
);

app.get('/applyForVerification', authenticateUser,
    async (req, res) => {
        const userID = req.session.userID;

        const status = await serverUtils.updateVerificationRequestStatus(config, userID, 'Processing');

        if (status) {
            res.json({ message: 'Verification request sent' });
        } else {
            res.status(500).json({ message: 'Verification request failed' });
        }
    }
);

app.get('/getServiceCenterOrders', authenticateUser,
    async (req, res) => {
        const userID = req.session.userID;

        const serviceCenterOrders = await serverUtils.getServiceCenterOrders(config, userID);

        res.json(serviceCenterOrders);
    }
);

app.get('/getOrderStatusList', authenticateUser,
    async (_, res) => {
        const orderStatusList = await serverUtils.getOrderStatusList(config);

        res.json({ status_list: orderStatusList });
    }
);

app.put('/updateOrderStatus', authenticateUser,
    async (req, res) => {
        const { order_id, status_id } = req.body;

        const updatedStatus = await serverUtils.updateOrderStatus(config, order_id, status_id);

        if (updatedStatus) {
            res.json({ message: 'Update successful' });
        } else {
            res.status(500).json({ message: 'Update unsuccessful' });
        }
    }
);

app.post('/createListing', authenticateUser,
    async (req, res) => {
        const userID = req.session.userID;
        const { title, description, price, serviceTypeId, deviceTypeId,
                isPremium, thumbnail, additionalPictures } = req.body;

        const status = await serverUtils.createNewListing(config, userID, title,
            description, price, serviceTypeId, deviceTypeId, isPremium, thumbnail,
            additionalPictures);

        if (status) {
            res.json({ message: 'Listing created successfully' });
        } else {
            res.status(500).json({ message: 'Listing creation failed' });
        }
    }
);

app.post('/getOrderToBeReviewed', authenticateUser,
    async (req, res) => {
        const { listing_id } = req.body;
        const userID = req.session.userID;

        const orderDetails = await serverUtils.getOrderToBeReviewed(config, userID, listing_id);

        res.json(orderDetails);
    }
);

app.listen(3000,
    () => console.log('Server is running on port 3000')
);
