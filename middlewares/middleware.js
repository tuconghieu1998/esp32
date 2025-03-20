export const authenticate = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/account/login');
    }
    next();
};