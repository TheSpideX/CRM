const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
    profile: {
        firstName: {
            type: String,
            required: [true, 'First name is required'],
            trim: true,
            minlength: [2, 'First name must be at least 2 characters'],
            maxlength: [30, 'First name cannot exceed 30 characters']
        },
        lastName: {
            type: String,
            required: [true, 'Last name is required'],
            trim: true,
            minlength: [2, 'Last name must be at least 2 characters'],
            maxlength: [30, 'Last name cannot exceed 30 characters']
        },
        avatar: String,
        phoneNumber: {
            type: String,
            validate: {
                validator: function(v) {
                    return /^\+?[\d\s-]{10,}$/.test(v);
                },
                message: 'Please enter a valid phone number'
            }
        },
        timezone: {
            type: String,
            default: 'UTC'
        }
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: function(email) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            },
            message: 'Please enter a valid email'
        },
        index: true
    },
    security: {
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [8, 'Password must be at least 8 characters'],
            validate: {
                validator: function(password) {
                    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);
                },
                message: 'Password must contain uppercase, lowercase, number, and special character'
            },
            select: false
        },
        passwordHistory: [{
            hash: String,
            changedAt: Date
        }],
        loginAttempts: {
            type: Number,
            default: 0
        },
        lockUntil: Date,
        passwordChangedAt: Date,
        passwordResetToken: String,
        passwordResetExpires: Date,
        twoFactorSecret: String,
        twoFactorEnabled: {
            type: Boolean,
            default: false
        },
        loginHistory: [{
            timestamp: Date,
            ipAddress: String,
            userAgent: String,
            location: String,
            status: {
                type: String,
                enum: ['success', 'failed']
            }
        }]
    },
    role: {
        type: String,
        enum: {
            values: ['customer', 'support', 'technical', 'team_lead', 'admin'],
            message: 'Invalid role specified'
        },
        default: 'customer',
        index: true
    },
    teamSettings: {
        teams: [{
            team: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Team'
            },
            role: {
                type: String,
                enum: ['member', 'lead']
            },
            joinedAt: Date,
            permissions: [String]
        }],
        maxTicketsPerDay: {
            type: Number,
            default: 10
        },
        currentTickets: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Ticket'
        }]
    },
    status: {
        isActive: {
            type: Boolean,
            default: true
        },
        lastActive: Date,
        presence: {
            type: String,
            enum: ['online', 'away', 'busy', 'offline'],
            default: 'offline'
        },
        customStatus: String
    },
    preferences: {
        notifications: {
            email: {
                type: Boolean,
                default: true
            },
            push: {
                type: Boolean,
                default: true
            },
            inApp: {
                type: Boolean,
                default: true
            },
            doNotDisturb: {
                enabled: Boolean,
                startTime: String,
                endTime: String
            }
        },
        theme: {
            type: String,
            enum: ['light', 'dark', 'system'],
            default: 'system'
        },
        language: {
            type: String,
            enum: ['en', 'es', 'fr', 'de', 'pt', 'zh'],
            default: 'en'
        },
        ticketView: {
            type: String,
            enum: ['list', 'board'],
            default: 'board'
        }
    },
    metrics: {
        ticketsResolved: {
            type: Number,
            default: 0
        },
        averageResponseTime: Number,
        customerSatisfactionScore: Number,
        lastMetricsUpdate: Date
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ 'profile.firstName': 1, 'profile.lastName': 1 });
UserSchema.index({ 'security.lockUntil': 1 });
UserSchema.index({ 'status.lastActive': 1 });
UserSchema.index({ 'teamSettings.teams.team': 1 });
UserSchema.index({ email: 1, 'status.isActive': 1 });

// Virtual field for full name
UserSchema.virtual('fullName').get(function() {
    return `${this.profile.firstName} ${this.profile.lastName}`;
});

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
    if (!this.isModified('security.password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(this.security.password, salt);
        
        // Store password in history
        if (this.security.passwordHistory) {
            this.security.passwordHistory.push({
                hash: hashedPassword,
                changedAt: new Date()
            });
            
            // Keep only last 5 passwords
            if (this.security.passwordHistory.length > 5) {
                this.security.passwordHistory.shift();
            }
        }
        
        this.security.password = hashedPassword;
        this.security.passwordChangedAt = Date.now() - 1000;
        
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.security.password);
    } catch (error) {
        throw new Error('Password comparison failed');
    }
};

// Method to check if password was changed after token was issued
UserSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
    if (this.security.passwordChangedAt) {
        const changedTimestamp = parseInt(this.security.passwordChangedAt.getTime() / 1000, 10);
        return JWTTimestamp < changedTimestamp;
    }
    return false;
};

// Method to generate password reset token
UserSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    this.security.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    
    this.security.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    return resetToken;
};

// Method to check if user account is locked
UserSchema.methods.isLocked = function() {
    return !!(this.security.lockUntil && this.security.lockUntil > Date.now());
};

// Method to increment login attempts
UserSchema.methods.incrementLoginAttempts = async function() {
    if (this.security.lockUntil && this.security.lockUntil < Date.now()) {
        return await this.updateOne({
            $set: { 'security.loginAttempts': 1 },
            $unset: { 'security.lockUntil': 1 }
        });
    }
    
    const updates = { $inc: { 'security.loginAttempts': 1 } };
    
    if (this.security.loginAttempts + 1 >= 5 && !this.isLocked()) {
        updates.$set = { 'security.lockUntil': Date.now() + 1 * 60 * 60 * 1000 }; // 1 hour lock
    }
    
    return await this.updateOne(updates);
};

// Method to reset login attempts
UserSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $set: { 'security.loginAttempts': 0 },
        $unset: { 'security.lockUntil': 1 }
    });
};

// Method to check if user is available for new tickets
UserSchema.methods.isAvailableForTickets = function() {
    return this.teamSettings.currentTickets.length < this.teamSettings.maxTicketsPerDay;
};

// Method to update user metrics
UserSchema.methods.updateMetrics = async function(ticketData) {
    this.metrics.ticketsResolved++;
    // Calculate new average response time if provided
    if (ticketData.responseTime) {
        const currentAvg = this.metrics.averageResponseTime || 0;
        this.metrics.averageResponseTime = 
            (currentAvg * (this.metrics.ticketsResolved - 1) + ticketData.responseTime) / 
            this.metrics.ticketsResolved;
    }
    // Update satisfaction score if provided
    if (ticketData.satisfactionScore) {
        this.metrics.customerSatisfactionScore = ticketData.satisfactionScore;
    }
    this.metrics.lastMetricsUpdate = new Date();
    return this.save();
};

// Method to add login history
UserSchema.methods.addLoginHistory = function(loginData) {
    const loginEntry = {
        timestamp: new Date(),
        ipAddress: loginData.ip,
        userAgent: loginData.userAgent,
        location: loginData.location,
        status: loginData.status
    };
    
    this.security.loginHistory.push(loginEntry);
    
    // Keep only last 10 login entries
    if (this.security.loginHistory.length > 10) {
        this.security.loginHistory.shift();
    }
    
    return this.save();
};

// Static method to get active team members
UserSchema.statics.getActiveTeamMembers = function(teamId) {
    return this.find({
        'teamSettings.teams.team': teamId,
        'status.isActive': true,
        role: { $in: ['support', 'technical', 'team_lead'] }
    }).select('-security.password');
};

const User = mongoose.model('User', UserSchema);

module.exports = User;
