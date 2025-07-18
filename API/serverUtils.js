const mariadb = require('mariadb');
const bcryptjs = require('bcryptjs');
// const fs = require('fs');
// const { config } = require('process');

async function addUser(config, accountType, username, displayname, email, password, phone_no, profilePic = null, address = null, bio = null) {
    let conn;
    try {
        conn = await mariadb.createConnection(config);
        const hashedPassword = await hashPassword(password);
        if ( ! hashedPassword)
            return false;

        await conn.query(
            "CALL AddUser(?, ?, ?, ?, ?, ?, ?, ?, ?)", 
            [username, displayname, email, hashedPassword, phone_no, profilePic, address, bio, accountType]
        );

        console.log('User added successfully!');

        return true;

    } catch (err) {
        console.error('Error adding user:', err);
        return false;
    } finally {
        if (conn) conn.end();
    }
}

async function verifyEmail(config, email, accountType) {
    let conn;
    try {
        conn = await mariadb.createConnection(config);

        let tableName = '';
        if (accountType.toLowerCase() === 'admin') {
            tableName = 'Admin';
        } else if (accountType.toLowerCase() === 'service center') {
            tableName = 'ServiceCenter';
        } else if (accountType.toLowerCase() === 'customer') {
            tableName = 'Customer';
        } else {
            console.error('Invalid account type:', accountType);
            return false;
        }

        const results = await conn.query(
            `SELECT user_id FROM Credential WHERE email = ? 
             AND user_id IN (SELECT user_id FROM ${tableName})`,
            [email]
        );

        return (results.length > 0); // True if the email exists, False otherwise
    } catch (err) {
        console.error('Error verifying email: ', err);
        return false;
    } finally {
        if (conn) conn.end();
    }
}

async function getUserDetails(config, email, password) {
    let conn;
    try {
        conn = await mariadb.createConnection(config);

        const creds = await conn.query(
            `SELECT user_id, email, pass_hash AS password_hash
             FROM Credential WHERE email = ?`,
            [email]
        );

        if (creds.length === 0 || ! (await bcryptjs.compare(password, creds[0].password_hash)) )
            return null;

        const details = await conn.query(
            `SELECT id, user_name AS username, display_name, profile_pic
             FROM User WHERE id = ?`,
             [creds[0].user_id]
        );

        // details should always have 1 column only as User.id = PK
        // & Credentail.user_id is FK taking reference from User.id
        return details[0];
    } catch (err) {
        console.error('Error verifying email: ', err);
        return null;
    } finally {
        if (conn) conn.end();
    }
}

function hashPassword(password) {
    const saltRounds = 10;

    return new Promise((resolve, reject) => {
        bcryptjs.genSalt(saltRounds, (err, salt) => {
            if (err) {
                reject(err);
            } else {
                bcryptjs.hash(password, salt, (err, hash) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(hash);
                    }
                });
            }
        });
    });
}

async function getExtraUserDetails(config, userID) {
    let conn;
    try {
        conn = await mariadb.createConnection(config);
        const results = await conn.query(
            `SELECT address, phone_no, bio FROM User WHERE id = ?`,
            [userID]
        );

        return results[0];
    } catch (err) {
        console.error('Error getting extra user details: ', err);
        return null;
    } finally {
        if (conn) conn.end();
    }
};

async function updateUserDetails(config, userID, display_name, address, phone_no, bio, profile_pic_base64) {
    let conn;
    try {
        conn = await mariadb.createConnection(config);

        const updatedList =
            (display_name ? `display_name = "${display_name}", ` : '') +
            (address ? `address = "${address}", ` : '') +
            (phone_no ? `phone_no = "${phone_no}", ` : '') +
            (bio ? `bio = "${bio}", ` : '')
        ;

        if ( updatedList.length > 0 ) {
            await conn.query(
                `UPDATE User
                SET ${updatedList.slice(0, updatedList.length - 2)}
                WHERE id = ${userID}`
            );
        }

        if ( profile_pic_base64 ) {
            await conn.query(
                `CALL UpdateProfilePicture(?, ?)`,
                [Buffer.from(profile_pic_base64, 'base64'), userID]
            );
        }

        return true;
    } catch (err) {
        console.error('Error updating user details: ', err);
        return false;
    } finally {
        if (conn) conn.end();
    }

}

async function getPictures(config) {
    let conn;
    try {
        conn = await mariadb.createConnection(config);
        const results = await conn.query("SELECT * FROM ServiceListingPictures");
        return results;
    } catch (err) {
        console.error('Error getting pictures: ', err);
        return null;
    } finally {
        if (conn) conn.end();
    }
}

async function getListingsDetails(config, listingID) {
    let conn;
    try {
        conn = await mariadb.createConnection(config);
        const listingDetails = await conn.query(
            `SELECT
             SL.id, SL.thumbnail_id, SL.service_title AS title,
             SL.service_description AS description, SCU.display_name AS owner_title,
             SC.verification_status AS owner_verification_status, price
            FROM
                ServiceListing AS SL
            JOIN User AS SCU on SL.owned_by = SCU.id
            JOIN ServiceCenter AS SC ON SL.owned_by = SC.user_id
            WHERE SL.id = ?`,
            [listingID]
        );
        if ( ! listingDetails ) return null;

        const picturesList = await conn.query(
            `SELECT picture_id, picture
             FROM ServiceListingPictures
             WHERE listing_id = ?`,
            [listingID]
        );

        return {
            ...listingDetails[0],
            pictures: picturesList
        };
    } catch (err) {
        console.error('Error getting Listing Details: ', err);
        return null;
    } finally {
        if (conn) conn.end();
    }
}

async function getListings(config, featured_only, count) {
    let conn;
    try {
        conn = await mariadb.createConnection(config);
        const results = await conn.query(
            `SELECT
             SL.id, SLP.picture AS thumbnail, SL.service_title AS title,
             SL.price, ST.type AS serviceType, DT.type AS deviceType,
             SL.is_premium AS isFeatured
             FROM
             (Select * FROM ServiceListing
                ${featured_only ? 'WHERE is_premium = True' : ''}
                ${count ? 'LIMIT ?' : ''}) AS SL
             JOIN ServiceListingPictures AS SLP ON SL.thumbnail_id = SLP.picture_id
             JOIN ServiceType AS ST ON ST.id = SL.service_type_id
             JOIN DeviceType AS DT ON DT.id = SL.device_type_id`,
             count     
        );

        return results;
    } catch (err) {
        console.error('Error getting pictures: ', err);
        return null;
    } finally {
        if (conn) conn.end();
    }
}

async function getOrders(config, userID) {
    let conn;
    try {
        conn = await mariadb.createConnection(config);

        const results = await conn.query(
            `SELECT O.id, SL.service_title, ST.type AS service_type, O.order_timestamp,
             SC.display_name AS service_center_name, OS.name AS status, OD.reservation_time,
             OD.quantity, ORec.total_cost, R.id AS review_id
            FROM 
            (Select id, order_timestamp FROM \`Order\` WHERE user_id = ?) AS O
            JOIN OrderReceipt AS ORec ON O.id = ORec.order_id
            JOIN OrderDetails AS OD ON O.id = OD.order_id
            JOIN OrderStatus AS OS ON OD.order_status_id = OS.id
            JOIN ServiceListing AS SL ON OD.service_listing_id = SL.id
            JOIN ServiceType AS ST ON SL.service_type_id = ST.id
            JOIN User AS SC ON SL.owned_by = SC.id
            LEFT JOIN Review AS R ON O.id = R.order_id
            `,
            [userID]
        );

        return results;
    } catch (err) {
        console.error('Error getting orders: ', err);
        return null;
    } finally {
        if (conn) conn.end();
    }
}

async function getTopReviews(config, count = 10) {
    let conn;serverUtils
    try {
        conn = await mariadb.createConnection(config);
        const results = await conn.query(
            `SELECT R.id, U.display_name AS 'name', R.rating, RP.picture AS thumbnail, R.description
             FROM (Select id, rating, description, thumbnail_id, order_id
                    FROM Review ORDER BY rating DESC LIMIT ?) AS R
             LEFT JOIN ReviewPictures AS RP ON R.thumbnail_id = RP.picture_id
             JOIN \`Order\` AS Ord ON R.order_id = Ord.id
             JOIN User AS U ON Ord.user_id = U.id
            `,
            [count]
        );

        return results;
    } catch (err) {
        console.error('Error getting reviews: ', err);
        return null;
    } finally {
        if (conn) conn.end();
    }
}

async function getReviews(config, listing_id, count = 10) {
    let conn;
    try {
        conn = await mariadb.createConnection(config);
        const results = await conn.query(
            `SELECT R.id, U.display_name AS 'name', R.rating, RP.picture AS thumbnail, R.description
             FROM (Select id, rating, description, thumbnail_id, order_id
                    FROM Review LIMIT ?) AS R
             LEFT JOIN ReviewPictures AS RP ON R.thumbnail_id = RP.picture_id
             JOIN \`Order\` AS Ord ON R.order_id = Ord.id
             JOIN OrderDetails AS OD ON Ord.id = OD.order_id
             JOIN User AS U ON Ord.user_id = U.id
             ${listing_id ? 'WHERE OD.service_listing_id = ?' : ''}
            `,
            [count, listing_id]
        );

        return results;
    } catch (err) {
        console.error('Error getting reviews: ', err);
        return null;
    } finally {
        if (conn) conn.end();
    }
}

async function makePurchase(config, userID, listing_id, reservation_time, quantity, total_cost, payment_proof_base64) {
    let conn;
    try {
        conn = await mariadb.createConnection(config);

        await conn.query(
            `CALL MakePurchase(?, ?, ?, ?, ?, ?)`,
            [userID, listing_id, reservation_time, quantity, total_cost, Buffer.from(payment_proof_base64, 'base64')]
        );

        return true;
    } catch (err) {
        console.error('Error making purchase: ', err);
        return false;
    } finally {
        if (conn) conn.end();
    }
}

async function getServicePackagesList(config) {
    let conn;
    try {
        conn = await mariadb.createConnection(config);
        const results = await conn.query(
            `SELECT id, package_name, description, chat_support, call_support
             FROM ServicePackage`
        );

        return results;
    } catch (err) {
        console.error('Error getting service packages: ', err);
        return null;
    } finally {
        if (conn) conn.end();
    }
}

async function getSelectedServicePackage(config, userID) {
    let conn;
    try {
        conn = await mariadb.createConnection(config);
        const results = await conn.query(
            `SELECT service_package_id FROM Customer WHERE user_id = ?`,
            [userID]
        );

        return results[0];
    } catch (err) {
        console.error('Error getting selected service package: ', err);
        return null;
    } finally {
        if (conn) conn.end();
    }
}

async function updateServicePackage(config, userID, new_package) {
    let conn;
    try {
        conn = await mariadb.createConnection(config);
        await conn.query(
            `UPDATE Customer
             SET service_package_id = ?
             WHERE user_id = ?`,
            [new_package, userID]
        );

        return true;
    } catch (err) {
        console.error('Error updating service package: ', err);
        return false;
    } finally {
        if (conn) conn.end();
    }
}

async function getServiceTypes(config) {
    let conn;
    try {
        conn = await mariadb.createConnection(config);
        const results = await conn.query(
            `SELECT * FROM ServiceType`
        );

        return results;
    } catch (err) {
        console.error('Error getting service types: ', err);
        return null;
    } finally {
        if (conn) conn.end();
    }
}

async function getDeviceTypes(config) {
    let conn;
    try {
        conn = await mariadb.createConnection(config);
        const results = await conn.query(
            `SELECT * FROM DeviceType`
        );

        return results;
    } catch (err) {
        console.error('Error getting service types: ', err);
        return null;
    } finally {
        if (conn) conn.end();
    }
}

async function getPendingVerificationRequests(config) {
    let conn;
    try {
        conn = await mariadb.createConnection(config);
        const results = await conn.query(
            `Select U.id, U.display_name, SC.contact_email, U.phone_no             
             FROM ServiceCenter AS SC
             JOIN User AS U on U.id = SC.user_id
             WHERE SC.verification_status = 'Processing'`
        );

        return results;
    } catch (err) {
        console.error('Error getting pending verification requests: ', err);
        return null;
    } finally {
        if (conn) conn.end();
    }
}

async function updateVerificationRequestStatus(config, userID, status) {
    let conn;
    try {
        conn = await mariadb.createConnection(config);
        await conn.query(
            `UPDATE ServiceCenter
             SET verification_status = ?
             WHERE user_id = ?`,
            [status, userID]
        );

        return true;
    } catch (err) {
        console.error('Error updating verification request status: ', err);
        return false;
    } finally {
        if (conn) conn.end();
    }
}

async function getPaymentRequests(config) {
    let conn;
    try {
        conn = await mariadb.createConnection(config);
        const results = await conn.query(
            `SELECT ORP.order_id, SL.service_title, ORP.total_cost, PM.type AS payment_method, ORP.payment_proof
             FROM OrderReceipt AS ORP
             JOIN OrderDetails AS OD ON ORP.order_id = OD.order_id
             JOIN ServiceListing AS SL ON OD.service_listing_id = SL.id
             JOIN PaymentMethod AS PM ON ORP.payment_method_id = PM.id
             WHERE payment_status = 'Processing'`
        );

        const paymentProofs = results.map((row) => {
            return {
                order_id:   row.order_id,
                title:      row.service_title,
                total_cost: row.total_cost,
                payment_method: row.payment_method,
                payment_proof:  row.payment_proof.toString('base64')
            };
        });

        return paymentProofs;
    } catch (err) {
        console.error('Error getting payment requests: ', err);
        return null;
    } finally {
        if (conn) conn.end();
    }
}

async function updatePaymentRequestStatus(config, orderID, status) {
    let conn;
    try {
        conn = await mariadb.createConnection(config);
        await conn.query(
            `UPDATE OrderReceipt
             SET payment_status = ?
             WHERE order_id = ?`,
            [status, orderID]
        );

        return true;
    } catch (err) {
        console.error('Error updating payment request status: ', err);
        return false;
    } finally {
        if (conn) conn.end();
    }
}

async function getVerificationStatus(config, userID) {
    let conn;
    try {
        conn = await mariadb.createConnection(config);
        const results = await conn.query(
            `SELECT verification_status
             FROM ServiceCenter
             WHERE user_id = ?`,
             [userID]
        );

        return results[0];
    } catch (err) {
        console.error('Error getting verification status: ', err);
        return null;
    } finally {
        if (conn) conn.end();
    }
}

async function getServiceCenterOrders(config, userID) {
    let conn;
    try {
        conn = await mariadb.createConnection(config);
        const results = await conn.query(
            `SELECT O.id AS order_id, SL.service_title AS title, ST.type AS service_type,
             O.order_timestamp, U.display_name AS owner_name, OS.name AS status,
             OD.order_status_id AS status_id, OD.reservation_time, OD.quantity,
             ORec.total_cost
            FROM \`Order\` AS O
            JOIN User AS U ON O.user_id = U.id
            JOIN OrderReceipt AS ORec ON O.id = ORec.order_id
            JOIN OrderDetails AS OD ON O.id = OD.order_id
            JOIN OrderStatus AS OS ON OD.order_status_id = OS.id
            JOIN ServiceListing AS SL ON OD.service_listing_id = SL.id
            JOIN ServiceType AS ST ON SL.service_type_id = ST.id
            WHERE SL.owned_by = ?`,
            [userID]
        );

        return results;
    } catch (err) {
        console.error('Error getting service center orders: ', err);
        return null;
    } finally {
        if (conn) conn.end();
    }
}

async function getOrderStatusList(config) {
    let conn;
    try {
        conn = await mariadb.createConnection(config);
        const results = await conn.query(
            `SELECT * FROM OrderStatus`
        );

        return results;
    } catch (err) {
        console.error('Error getting order status types: ', err);
        return null;
    } finally {
        if (conn) conn.end();
    }
}

async function updateOrderStatus(config, order_id, status_id) {
    let conn;
    try {
        conn = await mariadb.createConnection(config);
        await conn.query(
            `UPDATE OrderDetails
             SET order_status_id = ?
             WHERE order_id = ?`,
            [status_id, order_id]
        );

        return true;
    } catch (err) {
        console.error('Error updating order status: ', err);
        return false;
    } finally {
        if (conn) conn.end();
    }

}


async function createNewListing(config, userID, title, description, price,
    serviceTypeId, deviceTypeId, isPremium, thumbnail, additionalPictures) {
    let conn;
    try {
        conn = await mariadb.createConnection(config);

        await conn.query(`START TRANSACTION`);

        await conn.query(
            `CALL CreateNewListing(?, ?, ?, ?, ?, ?, ?, ?, @listing_id)`,
            [userID, title, description, price, serviceTypeId, deviceTypeId, isPremium,
            Buffer.from(thumbnail.slice(thumbnail.indexOf('base64,') + 7), 'base64')]
        );

        const [result] = await conn.query('SELECT @listing_id');
        const listing_id = result['@listing_id']; 

        for (const picture of additionalPictures) {
            await conn.query(
                 `CALL AddListingPicture(?, ?)`,
                 [listing_id, Buffer.from(picture.slice(picture.indexOf('base64,') + 7), 'base64')]
            );
        }

        await conn.query(`COMMIT`);

        return true;
    } catch (err) {
        console.error('Error creating new listing: ', err);
        return false;
    } finally {
        if (conn) conn.end();
    }
};

module.exports = {
    addUser,
    verifyEmail,
    getUserDetails,
    getOrders,
    getPictures,
    getListingsDetails,
    getListings,
    getTopReviews,
    getReviews,
    makePurchase,
    getExtraUserDetails,
    updateUserDetails,
    getServicePackagesList,
    getSelectedServicePackage,
    updateServicePackage,
    getServiceTypes,
    getDeviceTypes,
    getPendingVerificationRequests,
    updateVerificationRequestStatus,
    getPaymentRequests,
    updatePaymentRequestStatus,
    getVerificationStatus,
    getServiceCenterOrders,
    getOrderStatusList,
    updateOrderStatus,
    createNewListing,
};
