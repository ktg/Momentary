// Production specific configuration
// =================================
export default {
	allowedOrigins: [
		'https://your-site.com',
	],
	mongo: {
		uri: 'mongodb://mongo/typeExpress-dev'
	},

	// Server IP
	ip: process.env.OPENSHIFT_NODEJS_IP || process.env.IP || undefined,

	// Server port
	port: process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 80,

};
