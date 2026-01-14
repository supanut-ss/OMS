import * as React from 'react';
import PropTypes from 'prop-types';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

function LinearProgressWithLabel({ value, barColor }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: '100%', mr: 1 }}>
                <LinearProgress
                    variant="determinate"
                    value={value}
                    sx={{
                        height: 8,
                        borderRadius: 5,
                        backgroundColor: '#e0e0e0',
                        '& .MuiLinearProgress-bar': {
                            backgroundColor: barColor,
                        },
                    }}
                />
            </Box>
            <Box sx={{ minWidth: 40 }}>
                <Typography variant="body2" color="text.secondary">
                    {`${Math.round(value)}%`}
                </Typography>
            </Box>
        </Box>
    );
}

LinearProgressWithLabel.propTypes = {
    value: PropTypes.number.isRequired,
    barColor: PropTypes.string.isRequired,
};

export default function BSLinearWithValueLabel({ value, width = '100%' }) {
    const barColor =
        value >= 100
            ? '#619c18'
            : value >= 50
            ? '#ffcd00'
            : '#e20015';

    return (
        <Box sx={{ width }}>
            <LinearProgressWithLabel value={value} barColor={barColor} />
        </Box>
    );
}
