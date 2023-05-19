import {FC, useCallback, useEffect, useMemo, useState} from "react";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import debounce from 'lodash.debounce';
import Editor from '@monaco-editor/react';
import {
    Box,
    CircularProgress,
    FormControl,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    SelectChangeEvent,
    Stack,
    Typography,
} from "@mui/material";
import SyncAltIcon from '@mui/icons-material/SyncAlt';

type TranspileFunc = (value: string, from: string, to: string, onErrors?: string) => string

const defaultTranspile: TranspileFunc = () => { return "" }

export const App: FC = () => {
    const [code1, setCode1] = useState("");
    const [code2, setCode2] = useState("");
    const [transpile, setTranspile] = useState(() => defaultTranspile)
    const [fromDialect, setFromDialect] = useState("clickhouse")
    const [toDialect, setToDialect] = useState("clickhouse")
    const [dialectList, setDialectList] = useState(["clickhouse"])


    const defaultCode = `
SELECT
    passenger_count,
    toYear(pickup_datetime) AS year,
    round(trip_distance) AS distance,
    count(*)
FROM trips
GROUP BY passenger_count, year, distance
ORDER BY year, count(*) DESC;
`

    const changeHandler1 = useCallback((value: string) => {
        setCode1(value)
        try {
            const res = transpile(value, fromDialect, toDialect)
            setCode2(res)
        } catch (e) {
            console.error(e)
        }
    }, [transpile, fromDialect, toDialect])

    const debouncedChangeHandler1 = useMemo(
        () => debounce(changeHandler1, 600)
        , [changeHandler1]);

    const handleEditorChange1 = useCallback((value: (string | undefined)) => {
        if (value != null) {
            const res = transpile(value, fromDialect, toDialect, 'IGNORE')
            setCode2(res)
            debouncedChangeHandler1(value)
        }
    }, [debouncedChangeHandler1, fromDialect, toDialect, transpile])

    const handleChangeFrom = useCallback((event: SelectChangeEvent) => {
        setFromDialect(event.target.value)
        setCode2(transpile(code1, event.target.value, toDialect))
    }, [code1, toDialect, transpile])

    const handleChangeTo = useCallback((event: SelectChangeEvent) => {
        setToDialect(event.target.value)
        setCode2(transpile(code1, fromDialect, event.target.value))
    }, [code1, fromDialect, transpile])

    useEffect(() => {
        setCode1(defaultCode)
    }, [defaultCode])

    useEffect(() => {
        const load = async () => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const { loadPyodide } = await import("https://cdn.jsdelivr.net/pyodide/v0.23.2/full/pyodide.mjs")
            const pyodide = await loadPyodide()
            await pyodide.loadPackage("micropip")
            const micropip = pyodide.pyimport("micropip")
            await micropip.install('sqlglot')
            const namespace = pyodide.globals.get("dict")()
            pyodide.runPython(`
                import sqlglot
                from pyodide.ffi import to_js


                def transpile(sql, read=None, write=None, error_level='RAISE'):
                    try:
                        el = sqlglot.ErrorLevel(error_level)
                        compiled = sqlglot.transpile(sql, read=read, write=write, pretty=True, error_level=el)
                        return to_js(";\\n".join(compiled) + "\\n")
                    except Exception as e:
                        err_lines = str(e).splitlines()
                        return to_js("\\n".join(["-- ERROR"] + ["-- " + l for l in err_lines] + [""]))


                def get_dialects():
                    return to_js([d.value for d in sqlglot.dialects.Dialects if d.value])

            `, { globals: namespace })
            const getDialects = namespace.get("get_dialects")
            const dialects = getDialects.call()
            setDialectList(dialects)
            const pyTranspile = namespace.get("transpile")
            const transpile: (() => TranspileFunc) = () => (sql: string, from: string, to: string, onErrors = 'RAISE') => {
                return pyTranspile.callKwargs(sql, { read: from, write: to, error_level: onErrors })
            }
            setTranspile(transpile)
            setCode2(transpile()(defaultCode, fromDialect, toDialect))
        }

        load().catch(console.error)
    }, [defaultCode])

    const switchDialects = useCallback(() => {
        const codeLeft = code1
        const codeRight = code2
        const dialectLeft = fromDialect
        const dialectRight = toDialect
        setToDialect(dialectLeft)
        setFromDialect(dialectRight)
        setCode1(codeRight)
        setCode2(transpile(codeLeft, dialectRight, dialectLeft))
    }, [code1, code2, fromDialect, toDialect, transpile])

    return (
            <Grid container spacing={2} columns={25}>
                <Grid item xs={12}>
                    <FormControl>
                        <InputLabel id="demo-simple-select-label">From dialect:</InputLabel>
                        <Select
                            labelId="demo-simple-select-label"
                            id="demo-simple-select"
                            value={fromDialect}
                            label="From dialect:"
                            onChange={handleChangeFrom}
                        >
                            {dialectList.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={1} />
                <Grid item xs={12}>
                    <FormControl>
                        <InputLabel id="demo-simple-select-label">To dialect:</InputLabel>
                        <Select
                            labelId="demo-simple-select-label"
                            id="demo-simple-select"
                            value={toDialect}
                            label="To dialect:"
                            onChange={handleChangeTo}
                        >
                            {dialectList.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12}>
                    <Editor height="90vh" width="100%" defaultLanguage="sql" defaultValue={defaultCode} value={code1} onChange={handleEditorChange1}/>
                </Grid>
                <Grid item xs={1}>
                    <Box
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                    >
                        <IconButton aria-label="switch from-to" color="primary" onClick={switchDialects}>
                            <SyncAltIcon/>
                        </IconButton>
                    </Box>
                </Grid>
                <Grid item xs={12}>
                    {(code2) ?
                        <Editor height="90vh" width="100%" defaultLanguage="sql" value={code2} options={{readOnly: true}}/>
                        :
                        <Stack alignItems="center">
                            <Typography color="text.primary">Loading sqlglot library...</Typography>
                            <CircularProgress />
                        </Stack>
                    }
                </Grid>
            </Grid>
    )
}
