import {Box, Container, Link, Paper, Typography} from "@mui/material";

export default function SqlFooter() {
    return (
        <Paper sx={{marginTop: 'calc(10% + 60px)',
            width: '100%',
            position: 'fixed',
            bottom: 0,
        }} component="footer" square variant="outlined">
            <Container maxWidth="lg">
                <Box
                    sx={{
                        flexGrow: 1,
                        justifyContent: "center",
                        display: "flex",
                        my:1
                    }}
                >
                    <Typography variant="caption" color="initial">
                        <Link href="https://www.flaticon.com/free-icons/sql">Sql icons created by LAFS - Flaticon</Link>
                    </Typography>
                </Box>

                <Box
                    sx={{
                        flexGrow: 1,
                        justifyContent: "center",
                        display: "flex",
                        mb: 2,
                    }}
                >
                    <Typography variant="caption" color="initial">
                        Copyright ©2023. Constantine Peresypkin
                    </Typography>
                </Box>
            </Container>
        </Paper>
    );
}
