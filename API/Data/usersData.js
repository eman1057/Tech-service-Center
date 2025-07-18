const pfpFolder = "/home/yilliee/CLionProjects/DBProject/db/pictures/profile_pics/";

const users = [
    {
        'accountType': 'Admin',
        'username': 'yilliee',
        'display_name': 'Muhammad Taha',
        'email': 'yilliee@proton.me',
        'password': 'yilliee',
        'phone_no': '03331231234',
        'profile_pic_path': pfpFolder + 'yilliee.png',
        'address': null,
        'bio': null
    },
    {
        'accountType': 'Customer',
        'username': 'porouscoin',
        'display_name': 'Ziyad bin Hisham',
        'email': 'porouscoin@gmail.me',
        'password': 'porouscoin',
        'phone_no': '01231231234',
        'profile_pic_path': pfpFolder + 'porouscoin.png',
        'address': null,
        'bio': null,
    },
    {
        'accountType': 'Customer',
        'username': 'XtremeMainaic',
        'display_name': 'Ali Asghar',
        'email': 'aliasghar97@gmail.com',
        'password': '11223344',
        'phone_no': '05533131234',
        'profile_pic_path': pfpFolder + 'xtreme.png',
        'address': null,
        'bio': null,
    }
];

module.exports = users;